import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    // Connect to the separate backend server on port 5000
    socket = io("http://localhost:5000");
  }
  return socket;
};
