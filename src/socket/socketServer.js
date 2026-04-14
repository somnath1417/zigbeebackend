const { getAllDevices } = require("../store/deviceStore");
const { getAllStates, getSummary } = require("../store/stateStore");

let ioInstance = null;
let latestBrokerStatus = {
  connected: false,
  reconnecting: false,
  error: null,
};
let latestNetworkMap = null;

function getAllowedOrigins() {
  return [
    process.env.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:5173",
  ].filter(Boolean);
}

function initSocket(server) {
  const { Server } = require("socket.io");

  ioInstance = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
  });

  ioInstance.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // send current snapshot immediately
    socket.emit("devices_update", getAllDevices());
    socket.emit("states_update", getAllStates());
    socket.emit("summary_update", getSummary());
    socket.emit("broker_status", latestBrokerStatus);

    if (latestNetworkMap) {
      socket.emit("network_map_update", latestNetworkMap);
    }

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
  latestBrokerStatus = {
    ...latestBrokerStatus,
    ...status,
  };

  if (ioInstance) {
    ioInstance.emit("broker_status", latestBrokerStatus);
  }
}

function emitNetworkMap(data) {
  latestNetworkMap = data;

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
