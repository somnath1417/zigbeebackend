let ioInstance = null;

function initSocket(server) {
  const { Server } = require("socket.io");

  ioInstance = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  ioInstance.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  return ioInstance;
}

function emitDevices(devices) {
  if (ioInstance) {
    ioInstance.emit("devices_update", devices);
  }
}

function emitStates(states) {
  if (ioInstance) {
    ioInstance.emit("states_update", states);
  }
}

function emitSummary(summary) {
  if (ioInstance) {
    ioInstance.emit("summary_update", summary);
  }
}

function emitMqttStatus(status) {
  if (ioInstance) {
    ioInstance.emit("broker_status", status);
  }
}

function emitNetworkMap(data) {
  if (ioInstance) {
    ioInstance.emit("network_map_update", data);
  }
}

module.exports = {
  initSocket,
  emitDevices,
  emitStates,
  emitSummary,
  emitMqttStatus,
  emitNetworkMap,
};
