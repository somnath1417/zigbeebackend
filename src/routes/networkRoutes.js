const express = require("express");
const router = express.Router();

const { requestNetworkMap } = require("../mqtt/mqttClient");

router.get("/", async (req, res) => {
  try {
    const forceRefresh =
      String(req.query.forceRefresh || "false").toLowerCase() === "true";

    const result = await requestNetworkMap(forceRefresh);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Get network map error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch network map",
      error: error.message,
    });
  }
});

module.exports = router;
