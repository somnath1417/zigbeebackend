const { getAllDevices } = require("./deviceStore");

const statesByIeee = new Map();

function setDeviceState(ieee, deviceName, payload = {}) {
  if (!ieee) return null;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const previous = statesByIeee.get(ieee) || {};

  const next = {
    ...previous,
    ieee,
    ieee_address: ieee,
    ieeeAddr: ieee,
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
  if (!ieee) return false;
  return statesByIeee.delete(ieee);
}

function renameStateDeviceName(ieee, newName) {
  const state = statesByIeee.get(ieee);
  if (!state) return null;

  const updated = {
    ...state,
    deviceName: newName,
    updatedAt: new Date().toISOString(),
  };

  statesByIeee.set(ieee, updated);
  return updated;
}

function getSummary() {
  const allStates = getAllStates();
  const allDevices = getAllDevices();

  let online = 0;
  let batteryDevices = 0;
  let lowBattery = 0;

  allStates.forEach((item) => {
    const payload = item.payload || {};

    if (
      payload.state === "ON" ||
      payload.occupancy === true ||
      payload.contact === false
    ) {
      online += 1;
    }

    if (typeof payload.battery === "number") {
      batteryDevices += 1;
      if (payload.battery <= 20) {
        lowBattery += 1;
      }
    }
  });

  return {
    totalDevices: allDevices.length,
    totalStates: allStates.length,
    onlineLikeDevices: online,
    batteryDevices,
    lowBattery,
  };
}

module.exports = {
  setDeviceState,
  getStateByIeee,
  getAllStates,
  removeState,
  renameStateDeviceName,
  getSummary,
};