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
  getSummary,
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
let latestNetworkMap = null;
let latestNetworkMapAt = 0;
let mqttReady = false;

const NETWORK_MAP_CACHE_MS = 60 * 1000;

// state may arrive before bridge/devices
const pendingStatesByFriendlyName = new Map();

function safeJsonParse(message) {
  try {
    return JSON.parse(message.toString());
  } catch (error) {
    return null;
  }
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

    let done = false;

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
      if (done) return;
      done = true;
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

function broadcastAll() {
  emitDevices(getAllDevices());
  emitStates(getAllStates());
  emitSummary(getSummary());
}

function flushPendingStates() {
  const devices = getAllDevices();

  devices.forEach((device) => {
    const friendlyName = device?.friendly_name || device?.friendlyName;
    const ieee = device?.ieee_address || device?.ieeeAddr || device?.ieee;

    if (!friendlyName || !ieee) return;

    const pendingPayload = pendingStatesByFriendlyName.get(friendlyName);
    if (!pendingPayload) return;

    setDeviceState(ieee, friendlyName, pendingPayload);
    pendingStatesByFriendlyName.delete(friendlyName);
  });
}

function handleDeviceList(payload) {
  if (!Array.isArray(payload)) return;

  const filtered = payload.filter(
    (device) =>
      device &&
      device.type !== "Coordinator" &&
      device.friendly_name !== "Coordinator",
  );

  registerDevices(filtered);

  // attach any states that arrived earlier
  flushPendingStates();

  broadcastAll();
}

function handleStateTopic(topic, payload) {
  const friendlyName = extractFriendlyNameFromTopic(topic);
  if (!friendlyName) return;

  const device = getDeviceByTopicName(friendlyName);
  const ieee = device?.ieee_address || device?.ieeeAddr || device?.ieee || null;

  if (!ieee) {
    // keep it temporarily until device list comes
    const previous = pendingStatesByFriendlyName.get(friendlyName) || {};
    pendingStatesByFriendlyName.set(friendlyName, {
      ...previous,
      ...payload,
    });
    return;
  }

  setDeviceState(ieee, friendlyName, payload);
  emitStates(getAllStates());
  emitSummary(getSummary());
}

function startMqtt() {
  if (client) {
    return client;
  }

  client = mqtt.connect(mqttConfig.broker, mqttConfig.options);

  client.on("connect", () => {
    mqttReady = true;
    console.log("MQTT connected:", mqttConfig.broker);
    emitMqttStatus({ connected: true, reconnecting: false, error: null });

    client.subscribe(mqttConfig.topics.all, (err) => {
      if (err) {
        console.error("MQTT subscribe error:", err.message);
      } else {
        console.log("Subscribed to:", mqttConfig.topics.all);
      }
    });
  });

  client.on("reconnect", () => {
    mqttReady = false;
    console.log("MQTT reconnecting...");
    emitMqttStatus({ connected: false, reconnecting: true, error: null });
  });

  client.on("close", () => {
    mqttReady = false;
    console.log("MQTT connection closed");
    emitMqttStatus({ connected: false, reconnecting: false });
  });

  client.on("error", (error) => {
    mqttReady = false;
    console.error("MQTT error:", error.message);
    emitMqttStatus({
      connected: false,
      reconnecting: false,
      error: error.message,
    });
  });

  client.on("message", (topic, message, packet) => {
    const payload = safeJsonParse(message);

    if (topic === mqttConfig.topics.deviceList && Array.isArray(payload)) {
      handleDeviceList(payload);
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
      console.log("Retained message topic:", topic);
    }
  });

  return client;
}

function getClient() {
  return client;
}

function isMqttReady() {
  return mqttReady && !!client && client.connected;
}

async function requestPermitJoin(seconds = 120) {
  console.log("seconds", seconds);

  const payload = { time: Number(seconds) || 120 };

  const response = await publishAndWaitForResponse({
    requestTopic: mqttConfig.topics.permitJoinRequest,
    responseTopic: mqttConfig.topics.permitJoinResponse,
    payload,
    timeout: 10000,
  });

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

  return response || { success: true, ieee, newName };
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
  isMqttReady,
  requestPermitJoin,
  stopPermitJoin,
  renameDevice,
  removeDevice,
  controlDevice,
  requestNetworkMap,
};
