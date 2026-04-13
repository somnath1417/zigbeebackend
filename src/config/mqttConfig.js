const baseTopic = process.env.MQTT_BASE_TOPIC || "zigbee2mqtt";

const broker = process.env.MQTT_BROKER || "mqtt://localhost:1883";

const options = {
  username: process.env.MQTT_USERNAME || undefined,
  password: process.env.MQTT_PASSWORD || undefined,
  reconnectPeriod: 5000,
  connectTimeout: 30000,
  rejectUnauthorized: false,
  clean: true,
};

const topics = {
  all: `${baseTopic}/#`,

  bridgeState: `${baseTopic}/bridge/state`,
  deviceList: `${baseTopic}/bridge/devices`,
  deviceRequestList: `${baseTopic}/bridge/request/devices`,

  permitJoinRequest: `${baseTopic}/bridge/request/permit_join`,
  permitJoinResponse: `${baseTopic}/bridge/response/permit_join`,

  deviceRename: `${baseTopic}/bridge/request/device/rename`,
  deviceRenameResponse: `${baseTopic}/bridge/response/device/rename`,

  deviceRemove: `${baseTopic}/bridge/request/device/remove`,
  deviceRemoveResponse: `${baseTopic}/bridge/response/device/remove`,

  networkMapRequest: `${baseTopic}/bridge/request/networkmap`,
  networkMapResponse: `${baseTopic}/bridge/response/networkmap`,
};

module.exports = {
  broker,
  options,
  baseTopic,
  topics,
};
