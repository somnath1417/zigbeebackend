const express = require("express");
const router = express.Router();

const { getSummary } = require("../mqtt/mqttClient");

router.get("/", (req, res) => {
  try {
    return res.json(getSummary());
  } catch (error) {
    console.error("Get summary error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch summary",
      error: error.message,
    });
  }
});

module.exports = router;
