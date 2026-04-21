const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const deviceRoutes = require("./routes/deviceRoutes");

const app = express();

// ✅ Allowed origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5173",
].filter(Boolean);

// ✅ CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests without origin (Postman, curl)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error("CORS blocked:", origin);
      return callback(new Error(`CORS not allowed for origin: ${origin}`));
    },
    credentials: true,
  }),
);

// ✅ Important: handle preflight requests
app.options("*", cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.send("🔥 MY NEW BACKEND 🔥");
});

app.use("/api", (req, res, next) => {
  next();
});

app.use("/api", deviceRoutes);

module.exports = app;
