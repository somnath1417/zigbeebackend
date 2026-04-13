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

app.use(
  cors({
    origin:
      process.env.FRONTEND_URL?.split(",").map((url) => url.trim()) || "*",
    credentials: true,
  }),
);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
