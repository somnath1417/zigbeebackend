require("dotenv").config();

const http = require("http");
const app = require("./app");
const { initSocket } = require("./socket/socketServer");
const { startMqtt } = require("./mqtt/mqttClient");


const PORT = Number(process.env.PORT || 5000);
const server = http.createServer(app);

initSocket(server);
startMqtt();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
