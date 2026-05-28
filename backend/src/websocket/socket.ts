import { Server } from "socket.io";

let io: Server;

export const initSocket = (server: any) => {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join-assignment-room", (data) => {
      const assignmentId = typeof data === "string" ? data : data?.assignmentId;
      if (assignmentId) {
        socket.join(assignmentId);
        console.log(`Joined room ${assignmentId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }

  return io;
};