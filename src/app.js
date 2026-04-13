// const express = require("express");
// const cors = require("cors");
// const morgan = require("morgan");

// const deviceRoutes = require("./routes/deviceRoutes");

// const app = express();

// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL || "*",
//     credentials: true,
//   }),
// );

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(morgan("dev"));

// app.get("/", (req, res) => {
//   res.json({
//     success: true,
//     message: "Zigbee backend API is running",
//   });
// });

// app.use("/api", deviceRoutes);

// module.exports = app;

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const deviceRoutes = require("./routes/deviceRoutes");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// root test route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is running",
  });
});

app.use("/api", deviceRoutes);

module.exports = app;
