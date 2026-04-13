const devicesByIeee = new Map();
const topicNameToIeee = new Map();

function getDeviceIeee(device = {}) {
  return device.ieee_address || device.ieeeAddr || device.ieee || null;
}

function getFriendlyName(device = {}) {
  return device.friendly_name || device.friendlyName || null;
}

function rebuildTopicMap() {
  topicNameToIeee.clear();

  for (const device of devicesByIeee.values()) {
    const ieee = getDeviceIeee(device);
    const name = getFriendlyName(device);

    if (ieee && name) {
      topicNameToIeee.set(name, ieee);
    }
  }
}

function registerDevices(devices = []) {
  devicesByIeee.clear();

  for (const device of devices) {
    const ieee = getDeviceIeee(device);
    if (!ieee) continue;

    if (
      String(device?.type || "").toLowerCase() === "coordinator" &&
      String(getFriendlyName(device) || "").toLowerCase() === "coordinator"
    ) {
      continue;
    }

    devicesByIeee.set(ieee, {
      ...device,
      ieee,
    });
  }

  rebuildTopicMap();
  return getAllDevices();
}

function getAllDevices() {
  return Array.from(devicesByIeee.values());
}

function getDeviceByIeee(ieee) {
  return devicesByIeee.get(ieee) || null;
}

function getDeviceByTopicName(topicName) {
  const ieee = topicNameToIeee.get(topicName);
  if (!ieee) return null;
  return devicesByIeee.get(ieee) || null;
}

function renameDeviceInStore(ieee, newName) {
  const device = devicesByIeee.get(ieee);
  if (!device) return null;

  const updated = {
    ...device,
    friendly_name: newName,
  };

  devicesByIeee.set(ieee, updated);
  rebuildTopicMap();

  return updated;
}

function removeDeviceFromStore(ieee) {
  const existing = devicesByIeee.get(ieee) || null;
  devicesByIeee.delete(ieee);
  rebuildTopicMap();
  return existing;
}

module.exports = {
  registerDevices,
  getAllDevices,
  getDeviceByIeee,
  getDeviceByTopicName,
  renameDeviceInStore,
  removeDeviceFromStore,
};
