import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    // Connect to the backend server using environment variable
    socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");
  }
  return socket;
};
