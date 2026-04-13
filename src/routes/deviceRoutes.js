const express = require("express");
const router = express.Router();

const { getAllDevices, getDeviceByIeee } = require("../store/deviceStore");
const { getAllStates } = require("../store/stateStore");

const {
  requestPermitJoin,
  stopPermitJoin,
  renameDevice,
  removeDevice,
  controlDevice,
} = require("../mqtt/mqttClient");

/**
 * GET /api/devices
 */
router.get("/", (req, res) => {
  try {
    const devices = getAllDevices();

    return res.json({
      success: true,
      count: devices.length,
      data: devices,
    });
  } catch (error) {
    console.error("Get devices error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch devices",
      error: error.message,
    });
  }
});

/**
 * GET /api/devices/states
 */
router.get("/states", (req, res) => {
  try {
    const states = getAllStates();

    return res.json({
      success: true,
      count: states.length,
      data: states,
    });
  } catch (error) {
    console.error("Get states error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch states",
      error: error.message,
    });
  }
});

/**
 * POST /api/devices/permit-join
 * body: { seconds: 120 }
 */
router.post("/permit-join", async (req, res) => {
  try {
    const seconds = Number(req.body?.seconds ?? 120);

    if (Number.isNaN(seconds) || seconds < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid seconds value is required",
      });
    }

    const result = await requestPermitJoin(seconds);

    return res.json({
      success: true,
      message: `Permit join started for ${seconds} seconds`,
      data: result,
    });
  } catch (error) {
    console.error("Permit join start error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to start permit join",
      error: error.message,
    });
  }
});

/**
 * POST /api/devices/permit-join/stop
 */
router.post("/permit-join/stop", async (req, res) => {
  try {
    const result = await stopPermitJoin();

    return res.json({
      success: true,
      message: "Permit join stopped successfully",
      data: result,
    });
  } catch (error) {
    console.error("Permit join stop error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to stop permit join",
      error: error.message,
    });
  }
});

/**
 * POST /api/devices/:ieee/control
 */
router.post("/:ieee/control", async (req, res) => {
  try {
    const { ieee } = req.params;
    const command = req.body;

    if (!ieee) {
      return res.status(400).json({
        success: false,
        message: "Device IEEE is required",
      });
    }

    if (!command || typeof command !== "object" || Array.isArray(command)) {
      return res.status(400).json({
        success: false,
        message: "Valid command object is required in request body",
      });
    }

    const existingDevice = getDeviceByIeee(ieee);

    if (!existingDevice) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    const result = await controlDevice(ieee, command);

    return res.json({
      success: true,
      message: "Device command published successfully",
      data: result,
    });
  } catch (error) {
    console.error("Control device error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to control device",
      error: error.message,
    });
  }
});

/**
 * PUT /api/devices/:ieee/rename
 * body: { name: "New Device Name" }
 */
router.put("/:ieee/rename", async (req, res) => {
  try {
    const { ieee } = req.params;
    const { name } = req.body;

    if (!ieee) {
      return res.status(400).json({
        success: false,
        message: "Device IEEE is required",
      });
    }

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "New device name is required",
      });
    }

    const existingDevice = getDeviceByIeee(ieee);

    if (!existingDevice) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    const trimmedName = String(name).trim();
    const result = await renameDevice(ieee, trimmedName);

    return res.json({
      success: true,
      message: "Device renamed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Rename device error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to rename device",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/devices/:ieee
 */
router.delete("/:ieee", async (req, res) => {
  try {
    const { ieee } = req.params;

    if (!ieee) {
      return res.status(400).json({
        success: false,
        message: "Device IEEE is required",
      });
    }

    const existingDevice = getDeviceByIeee(ieee);

    if (!existingDevice) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    const result = await removeDevice(ieee);

    return res.json({
      success: true,
      message: "Device removed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Remove device error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove device",
      error: error.message,
    });
  }
});

module.exports = router;
