const express = require("express");
const router = express.Router();

const { getAllDevices, getDeviceByIeee } = require("../store/deviceStore");
const { getAllStates, getSummary } = require("../store/stateStore");
const { isMqttReady } = require("../mqtt/mqttClient");

const {
  requestPermitJoin,
  stopPermitJoin,
  renameDevice,
  removeDevice,
  controlDevice,
  requestNetworkMap,
} = require("../mqtt/mqttClient");

/**
 * GET /api/devices
 */

router.get("/devices", (req, res) => {
  try {   
    const devices = getAllDevices();

    res.json({
      success: true,
      mqttReady: isMqttReady(),
      count: devices.length,
      data: devices,
    });
  } catch (error) {
    console.error("Get devices error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch devices",
      error: error.message,
    });
  }
});

/**
 * GET /api/states
 */
router.get("/states", (req, res) => {
  try {
    const states = getAllStates();

    res.json({
      success: true,
      mqttReady: isMqttReady(),
      count: states.length,
      data: states,
    });
  } catch (error) {
    console.error("Get states error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch states",
      error: error.message,
    });
  }
});

/**
 * GET /api/summary
 */
router.get("/summary", (req, res) => {
  try {
    const devices = getAllDevices();
    const states = getAllStates();
    const summary = getSummary();

    res.json({
      success: true,
      mqttReady: isMqttReady(),
      data: {
        totalDevices: devices.length,
        totalStates: states.length,
        ...summary,
      },
    });
  } catch (error) {
    console.error("Get summary error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch summary",
      error: error.message,
    });
  }
});

/**
 * GET /api/health
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    mqttReady: isMqttReady(),
  });
});

/**
 * POST /api/pairing/start
 * body: { seconds: 120 }
 */
router.post("/pairing/start", async (req, res) => {
  try {
    const seconds = Number(req.body?.seconds || 120);
    const response = await requestPermitJoin(seconds);

    res.json({
      success: true,
      message: `Pairing started for ${seconds} seconds`,
      data: response,
    });
  } catch (error) {
    console.error("Start pairing error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start pairing",
      error: error.message,
    });
  }
});

/**
 * POST /api/pairing/stop
 */
router.post("/pairing/stop", async (req, res) => {
  try {
    const response = await stopPermitJoin();

    res.json({
      success: true,
      message: "Pairing stopped",
      data: response,
    });
  } catch (error) {
    console.error("Stop pairing error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to stop pairing",
      error: error.message,
    });
  }
});

/**
 * PUT /api/devices/:ieee/rename
 * body: { name: "New Device Name" }
 */
router.put("/devices/:ieee/rename", async (req, res) => {
  try {
    const { ieee } = req.params;
    const { name } = req.body;

    if (!ieee) {
      return res.status(400).json({
        success: false,
        message: "IEEE is required",
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "New name is required",
      });
    }

    const response = await renameDevice(ieee, name.trim());

    res.json({
      success: true,
      message: "Device renamed successfully",
      data: response,
    });
  } catch (error) {
    console.error("Rename device error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to rename device",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/devices/:ieee
 */
router.delete("/devices/:ieee", async (req, res) => {
  try {
    const { ieee } = req.params;

    if (!ieee) {
      return res.status(400).json({
        success: false,
        message: "IEEE is required",
      });
    }

    const device = getDeviceByIeee(ieee);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    const response = await removeDevice(ieee);

    res.json({
      success: true,
      message: "Device removed successfully",
      data: response,
    });
  } catch (error) {
    console.error("Remove device error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove device",
      error: error.message,
    });
  }
});

/**
 * POST /api/devices/:ieee/control
 * body: any valid zigbee command payload
 */
router.post("/devices/:ieee/control", async (req, res) => {
  try {
    const { ieee } = req.params;
    const command = req.body;

    if (!ieee) {
      return res.status(400).json({
        success: false,
        message: "IEEE is required",
      });
    }

    if (!command || typeof command !== "object" || Array.isArray(command)) {
      return res.status(400).json({
        success: false,
        message: "Valid command payload is required",
      });
    }

    const response = await controlDevice(ieee, command);

    res.json({
      success: true,
      message: "Device command published successfully",
      data: response,
    });
  } catch (error) {
    console.error("Control device error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to control device",
      error: error.message,
    });
  }
});

/**
 * GET /api/network-map
 * query: ?refresh=true
 */
router.get("/network-map", async (req, res) => {
  try {
    const refresh = String(req.query.refresh || "false") === "true";
    const response = await requestNetworkMap(refresh);

    res.json(response);
  } catch (error) {
    console.error("Network map error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch network map",
      error: error.message,
    });
  }
});

module.exports = router;
