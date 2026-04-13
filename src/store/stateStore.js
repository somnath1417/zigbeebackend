const statesByIeee = new Map();

function setDeviceState(ieee, deviceName, payload = {}) {
  if (!ieee) return null;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  if (Object.keys(payload).length === 0) {
    return null;
  }

  const previous = statesByIeee.get(ieee) || {};

  const next = {
    ...previous,
    ieee,
    deviceName: deviceName || previous.deviceName || "Unknown Device",
    payload: {
      ...(previous.payload || {}),
      ...payload,
    },
    updatedAt: new Date().toISOString(),
  };

  statesByIeee.set(ieee, next);
  return next;
}

function getStateByIeee(ieee) {
  return statesByIeee.get(ieee) || null;
}

function getAllStates() {
  return Array.from(statesByIeee.values());
}

function removeState(ieee) {
  return statesByIeee.delete(ieee);
}

function renameStateDeviceName(ieee, newName) {
  const current = statesByIeee.get(ieee);
  if (!current) return null;

  const updated = {
    ...current,
    deviceName: newName,
  };

  statesByIeee.set(ieee, updated);
  return updated;
}

function clearAllStates() {
  statesByIeee.clear();
}

function cleanupStates(validIeeeList = []) {
  const validSet = new Set(validIeeeList);
  let removedCount = 0;

  for (const ieee of statesByIeee.keys()) {
    if (!validSet.has(ieee)) {
      statesByIeee.delete(ieee);
      removedCount += 1;
    }
  }

  return removedCount;
}

module.exports = {
  setDeviceState,
  getStateByIeee,
  getAllStates,
  removeState,
  renameStateDeviceName,
  clearAllStates,
  cleanupStates,
};
