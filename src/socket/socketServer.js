const { Server } = require("socket.io");

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:5173",
      ].filter(Boolean),
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
}

function getIo() {
  return io;
}

function emitDevices(devices = []) {
  if (!io) return;
  io.emit("devices", devices);
}

function emitStates(states = []) {
  if (!io) return;
  io.emit("states", states);
}

function emitSummary(summary = {}) {
  if (!io) return;
  io.emit("summary", summary);
}

function emitMqttStatus(status = {}) {
  if (!io) return;
  io.emit("mqtt-status", status);
}

function emitNetworkMap(networkMap = {}) {
  if (!io) return;
  io.emit("network-map", networkMap);
}

module.exports = {
  initSocket,
  getIo,
  emitDevices,
  emitStates,
  emitSummary,
  emitMqttStatus,
  emitNetworkMap,
};
