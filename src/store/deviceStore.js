const devicesByIeee = new Map();
const topicToIeeeMap = new Map();

function normalizeIeee(device = {}) {
  return (
    device.ieee_address ||
    device.ieeeAddr ||
    device.ieee ||
    device.ieeeAddress ||
    null
  );
}

function normalizeFriendlyName(device = {}) {
  return (
    device.friendly_name ||
    device.friendlyName ||
    device.name ||
    "Unknown Device"
  );
}

function registerDevice(device) {
  const ieee = normalizeIeee(device);
  if (!ieee) return null;

  const existing = devicesByIeee.get(ieee) || {};

  const merged = {
    ...existing,
    ...device,
    ieee_address: ieee,
    ieeeAddr: ieee,
    ieee,
    friendly_name: normalizeFriendlyName(device),
    friendlyName: normalizeFriendlyName(device),
  };

  devicesByIeee.set(ieee, merged);

  const topicName = merged.friendly_name;
  if (topicName) {
    topicToIeeeMap.set(topicName, ieee);
  }

  return merged;
}

function registerDevices(devices = []) {
  devices.forEach(registerDevice);
  return getAllDevices();
}

function getAllDevices() {
  return Array.from(devicesByIeee.values());
}

function getDeviceByIeee(ieee) {
  return devicesByIeee.get(ieee) || null;
}

function getDeviceByTopicName(topicName) {
  const ieee = topicToIeeeMap.get(topicName);
  if (!ieee) return null;
  return getDeviceByIeee(ieee);
}

function renameDeviceInStore(ieee, newName) {
  const device = devicesByIeee.get(ieee);
  if (!device) return null;

  const oldName = device.friendly_name || device.friendlyName;
  if (oldName) {
    topicToIeeeMap.delete(oldName);
  }

  const updated = {
    ...device,
    friendly_name: newName,
    friendlyName: newName,
  };

  devicesByIeee.set(ieee, updated);
  topicToIeeeMap.set(newName, ieee);

  return updated;
}

function removeDeviceFromStore(ieee) {
  const device = devicesByIeee.get(ieee);
  if (!device) return false;

  const oldName = device.friendly_name || device.friendlyName;
  if (oldName) {
    topicToIeeeMap.delete(oldName);
  }

  devicesByIeee.delete(ieee);
  return true;
}

module.exports = {
  registerDevice,
  registerDevices,
  getAllDevices,
  getDeviceByIeee,
  getDeviceByTopicName,
  renameDeviceInStore,
  removeDeviceFromStore,
  normalizeIeee,
  normalizeFriendlyName,
  topicToIeeeMap,
};
