const mqttConfig = require("../config/mqttConfig");

function getTopicSuffix(topic) {
  const prefix = `${mqttConfig.baseTopic}/`;
  if (!topic.startsWith(prefix)) return null;
  return topic.slice(prefix.length);
}

function extractFriendlyNameFromTopic(topic) {
  const suffix = getTopicSuffix(topic);
  if (!suffix) return null;
  if (suffix.startsWith("bridge/")) return null;

  const parts = suffix.split("/");
  return parts[0] || null;
}

function isDeviceStateTopic(topic) {
  const suffix = getTopicSuffix(topic);
  if (!suffix) return false;
  if (suffix.startsWith("bridge/")) return false;

  const parts = suffix.split("/");
  return parts.length === 1;
}

module.exports = {
  extractFriendlyNameFromTopic,
  isDeviceStateTopic,
};
