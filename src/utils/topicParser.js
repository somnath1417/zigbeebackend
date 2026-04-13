function extractFriendlyNameFromTopic(topic = "") {
  const parts = String(topic).split("/");

  if (parts.length < 2) return null;
  if (parts[1] === "bridge") return null;

  return parts[1] || null;
}

function isDeviceStateTopic(topic = "") {
  const parts = String(topic).split("/");

  if (parts.length < 2) return false;
  if (parts[1] === "bridge") return false;
  if (parts[parts.length - 1] === "set") return false;

  return true;
}

module.exports = {
  extractFriendlyNameFromTopic,
  isDeviceStateTopic,
};
