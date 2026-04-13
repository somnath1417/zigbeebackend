const mqtt = require("mqtt");
const mqttConfig = require("../config/mqttConfig");

const {
  registerDevices,
  getAllDevices,
  getDeviceByIeee,
  getDeviceByTopicName,
  renameDeviceInStore,
  removeDeviceFromStore,
} = require("../store/deviceStore");

const {
  setDeviceState,
  getAllStates,
  removeState,
  renameStateDeviceName,
  cleanupStates,
} = require("../store/stateStore");

const {
  extractFriendlyNameFromTopic,
  isDeviceStateTopic,
} = require("../utils/topicParser");

const {
  emitDevices,
  emitStates,
  emitSummary,
  emitMqttStatus,
  emitNetworkMap,
} = require("../socket/socketServer");

let client = null;
let brokerConnected = false;
let permitJoin = false;

let latestNetworkMap = null;
let latestNetworkMapAt = 0;
const NETWORK_MAP_CACHE_MS = 60 * 1000;

function safeJsonParse(message) {
  try {
    return JSON.parse(message.toString());
  } catch (error) {
    return null;
  }
}

function getSummary() {
  return {
    brokerConnected,
    permitJoin,
    deviceCount: getAllDevices().length,
    stateCount: getAllStates().length,
  };
}

function broadcastAll() {
  emitDevices(getAllDevices());
  emitStates(getAllStates());
  emitSummary(getSummary());
}

function publishAndWaitForResponse({
  requestTopic,
  responseTopic,
  payload,
  timeout = 10000,
  validateResponse,
}) {
  return new Promise((resolve, reject) => {
    if (!client || !client.connected) {
      return reject(new Error("MQTT not connected"));
    }

    let finished = false;

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for response on ${responseTopic}`));
    }, timeout);

    const handleMessage = (topic, messageBuffer) => {
      if (topic !== responseTopic) return;

      const response = safeJsonParse(messageBuffer);

      if (validateResponse && !validateResponse(response)) {
        return;
      }

      cleanup();
      resolve(response);
    };

    function cleanup() {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      client.removeListener("message", handleMessage);
    }

    client.on("message", handleMessage);

    client.publish(requestTopic, JSON.stringify(payload), (err) => {
      if (err) {
        cleanup();
        reject(err);
      }
    });
  });
}

// function handleDeviceList(payload) {
//   if (!Array.isArray(payload)) return;

//   registerDevices(payload);
//   emitDevices(getAllDevices());
//   emitSummary(getSummary());
// }
function handleDeviceList(payload) {
  if (!Array.isArray(payload)) return;

  const devices = registerDevices(payload);

  const validIeeeList = devices
    .map((device) => device.ieee_address || device.ieeeAddr || device.ieee)
    .filter(Boolean);

  const removedCount = cleanupStates(validIeeeList);

  if (removedCount > 0) {
    console.log(`Removed ${removedCount} stale states from store`);
  }

  emitDevices(getAllDevices());
  emitStates(getAllStates());
  emitSummary(getSummary());
}
// function handleStateTopic(topic, payload) {
//   const friendlyName = extractFriendlyNameFromTopic(topic);
//   if (!friendlyName) return;

//   const device = getDeviceByTopicName(friendlyName);
//   const ieee = device?.ieee_address || device?.ieeeAddr || device?.ieee || null;

//   if (!ieee) return;

//   setDeviceState(ieee, friendlyName, payload);
//   emitStates(getAllStates());
//   emitSummary(getSummary());
// }

function handleStateTopic(topic, payload) {
  const friendlyName = extractFriendlyNameFromTopic(topic);
  if (!friendlyName) return;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return;
  }

  if (Object.keys(payload).length === 0) {
    return;
  }

  const device = getDeviceByTopicName(friendlyName);
  if (!device) return;

  const ieee = device?.ieee_address || device?.ieeeAddr || device?.ieee || null;
  if (!ieee) return;

  setDeviceState(ieee, friendlyName, payload);

  emitStates(getAllStates());
  emitSummary(getSummary());
}

function requestDeviceList() {
  if (!client || !client.connected) {
    console.log("MQTT not connected, cannot request device list");
    return;
  }

  client.publish(mqttConfig.topics.deviceRequestList, "", (err) => {
    if (err) {
      console.error("Device list request failed:", err.message);
    }
  });
}

function startMqtt() {
  if (client) return client;

  client = mqtt.connect(mqttConfig.broker, mqttConfig.options);

  client.on("connect", () => {
    brokerConnected = true;
    console.log("MQTT connected:", mqttConfig.broker);

    emitMqttStatus({
      connected: true,
      broker: mqttConfig.broker,
    });

    emitSummary(getSummary());

    client.subscribe(mqttConfig.topics.all, (err) => {
      if (err) {
        console.error("MQTT subscribe error:", err.message);
      } else {
        console.log("Subscribed to:", mqttConfig.topics.all);

        setTimeout(() => {
          requestDeviceList();
        }, 1000);
      }
    });
  });

  client.on("reconnect", () => {
    brokerConnected = false;
    console.log("MQTT reconnecting...");

    emitMqttStatus({
      connected: false,
      reconnecting: true,
      broker: mqttConfig.broker,
    });

    emitSummary(getSummary());
  });

  client.on("close", () => {
    brokerConnected = false;
    console.log("MQTT connection closed");

    emitMqttStatus({
      connected: false,
      broker: mqttConfig.broker,
    });

    emitSummary(getSummary());
  });

  client.on("error", (error) => {
    console.error("MQTT error:", error.message);

    emitMqttStatus({
      connected: false,
      broker: mqttConfig.broker,
      error: error.message,
    });
  });

  client.on("message", (topic, message, packet) => {
    const payload = safeJsonParse(message);

    if (topic === mqttConfig.topics.bridgeState) {
      const stateText = message
        .toString()
        .replace(/"/g, "")
        .trim()
        .toLowerCase();
      brokerConnected = stateText === "online";

      emitMqttStatus({
        connected: brokerConnected,
        broker: mqttConfig.broker,
        bridgeState: stateText,
      });

      emitSummary(getSummary());
      return;
    }

    if (topic === mqttConfig.topics.deviceList && Array.isArray(payload)) {
      handleDeviceList(payload);
      return;
    }

    if (topic === mqttConfig.topics.permitJoinResponse && payload) {
      if (typeof payload?.value === "boolean") {
        permitJoin = payload.value;
      } else if (typeof payload?.permit_join === "boolean") {
        permitJoin = payload.permit_join;
      } else if (payload?.data && typeof payload.data.value === "boolean") {
        permitJoin = payload.data.value;
      }

      emitSummary(getSummary());
      return;
    }

    if (topic === mqttConfig.topics.networkMapResponse && payload) {
      latestNetworkMap = payload;
      latestNetworkMapAt = Date.now();
      emitNetworkMap(payload);
      return;
    }

    if (isDeviceStateTopic(topic) && payload && typeof payload === "object") {
      handleStateTopic(topic, payload);
      return;
    }

    if (packet?.retain) {
      console.log("Retained topic:", topic);
    }
  });

  return client;
}

function getClient() {
  return client;
}

async function requestPermitJoin(seconds = 120) {
  const payload = { time: Number(seconds) || 120 };

  const response = await publishAndWaitForResponse({
    requestTopic: mqttConfig.topics.permitJoinRequest,
    responseTopic: mqttConfig.topics.permitJoinResponse,
    payload,
    timeout: 10000,
  });

  permitJoin = payload.time > 0;
  emitSummary(getSummary());

  return response || { success: true, requested: payload.time };
}

async function stopPermitJoin() {
  return requestPermitJoin(0);
}

async function renameDevice(ieee, newName) {
  if (!ieee || !newName) {
    throw new Error("IEEE and newName are required");
  }

  const response = await publishAndWaitForResponse({
    requestTopic: mqttConfig.topics.deviceRename,
    responseTopic: mqttConfig.topics.deviceRenameResponse,
    payload: {
      from: ieee,
      to: newName,
    },
    timeout: 15000,
  });

  renameDeviceInStore(ieee, newName);
  renameStateDeviceName(ieee, newName);
  broadcastAll();

  return (
    response || {
      success: true,
      ieee,
      newName,
    }
  );
}

async function removeDevice(ieee) {
  if (!ieee) {
    throw new Error("IEEE is required");
  }

  const device = getDeviceByIeee(ieee);

  const response = await publishAndWaitForResponse({
    requestTopic: mqttConfig.topics.deviceRemove,
    responseTopic: mqttConfig.topics.deviceRemoveResponse,
    payload: {
      id: ieee,
      force: true,
      block: false,
    },
    timeout: 30000,
    validateResponse: (data) => {
      if (!data || typeof data !== "object") return false;

      const responseId =
        data?.data?.id ||
        data?.id ||
        data?.data?.ieeeAddr ||
        data?.data?.ieee_address;

      return !responseId || responseId === ieee;
    },
  });

  removeDeviceFromStore(ieee);
  removeState(ieee);
  broadcastAll();

  return (
    response || {
      success: true,
      removed: ieee,
      friendly_name: device?.friendly_name || null,
    }
  );
}

async function controlDevice(ieee, command = {}) {
  if (!client || !client.connected) {
    throw new Error("MQTT not connected");
  }

  if (!ieee) {
    throw new Error("IEEE is required");
  }

  const device = getDeviceByIeee(ieee);

  if (!device) {
    throw new Error("Device not found in store");
  }

  const topicName = device.friendly_name || device.friendlyName;

  if (!topicName) {
    throw new Error("Device friendly name not found");
  }

  const topic = `${mqttConfig.baseTopic}/${topicName}/set`;

  return new Promise((resolve, reject) => {
    client.publish(topic, JSON.stringify(command), (err) => {
      if (err) return reject(err);

      resolve({
        success: true,
        topic,
        command,
      });
    });
  });
}

async function requestNetworkMap(forceRefresh = false) {
  const now = Date.now();

  if (
    !forceRefresh &&
    latestNetworkMap &&
    now - latestNetworkMapAt < NETWORK_MAP_CACHE_MS
  ) {
    return {
      success: true,
      cached: true,
      data: latestNetworkMap,
    };
  }

  const response = await publishAndWaitForResponse({
    requestTopic: mqttConfig.topics.networkMapRequest,
    responseTopic: mqttConfig.topics.networkMapResponse,
    payload: {
      type: "raw",
      routes: true,
    },
    timeout: 20000,
  });

  latestNetworkMap = response;
  latestNetworkMapAt = Date.now();

  emitNetworkMap(response);

  return {
    success: true,
    cached: false,
    data: response,
  };
}

module.exports = {
  startMqtt,
  getClient,
  requestPermitJoin,
  stopPermitJoin,
  renameDevice,
  removeDevice,
  controlDevice,
  requestNetworkMap,
  requestDeviceList,
  getSummary,
};
