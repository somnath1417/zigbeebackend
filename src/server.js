// require("dotenv").config();

// const http = require("http");
// const app = require("./app");
// const { initSocket } = require("./socket/socketServer");
// const { startMqtt } = require("./mqtt/mqttClient");

// const PORT = Number(process.env.PORT || 3001);

// const server = http.createServer(app);

// initSocket(server);
// startMqtt();

// server.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });

require("dotenv").config();

const http = require("http");
const app = require("./app");
const { initSocket } = require("./socket/socketServer");
const { startMqtt } = require("./mqtt/mqttClient");
const cors = require("cors");

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

initSocket(server);
startMqtt();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS not allowed for origin: ${origin}`));
    },
    credentials: true,
  }),
);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
