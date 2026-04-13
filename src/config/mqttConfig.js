require("dotenv").config();

const baseTopic = process.env.MQTT_BASE_TOPIC || "zigbee2mqtt";

module.exports = {
  broker: process.env.MQTT_BROKER || "mqtt://127.0.0.1:1883",

  options: {
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    clientId:
      process.env.MQTT_CLIENT_ID ||
      `backend-${Math.random().toString(16).slice(2, 10)}`,
    reconnectPeriod: Number(process.env.MQTT_RECONNECT_PERIOD || 3000),
    connectTimeout: Number(process.env.MQTT_CONNECT_TIMEOUT || 30000),
    rejectUnauthorized: false,
  },

  baseTopic,

  topics: {
    all: `${baseTopic}/#`,
    deviceList: `${baseTopic}/bridge/devices`,
    deviceRemove: `${baseTopic}/bridge/request/device/remove`,
    deviceRemoveResponse: `${baseTopic}/bridge/response/device/remove`,
    deviceRename: `${baseTopic}/bridge/request/device/rename`,
    deviceRenameResponse: `${baseTopic}/bridge/response/device/rename`,
    permitJoinRequest: `${baseTopic}/bridge/request/permit_join`,
    permitJoinResponse: `${baseTopic}/bridge/response/permit_join`,
    networkMapRequest: `${baseTopic}/bridge/request/networkmap`,
    networkMapResponse: `${baseTopic}/bridge/response/networkmap`,
  },
};
