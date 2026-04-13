const express = require("express");
const cors = require("cors");

const deviceRoutes = require("./routes/deviceRoutes");
const networkRoutes = require("./routes/networkRoutes.js");
const summaryRoutes = require("./routes/summaryRoutes");

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend is running",
  });
});

app.use("/api/devices", deviceRoutes);
app.use("/api/network", networkRoutes);
app.use("/api/summary", summaryRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((error, req, res, next) => {
  console.error("App error:", error);

  res.status(500).json({
    success: false,
    message: error.message || "Internal server error",
  });
});

module.exports = app;
