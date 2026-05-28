import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";

import db from "./config/db.js";

import assignmentRoutes from "./routes/assignment.routes.js";
import userRoutes from "./routes/user.route.js";
import uploadRoutes from "./routes/upload.routes.js";
import { initSocket } from "./websocket/socket.js";
import "./workers/assignment.worker.js";
import { errorHandler } from "./middlewares/error.middleware.js";

dotenv.config();

const app = express();

const server = http.createServer(app);

initSocket(server);


db.on('error',(error)=>{
    console.log(error)
})

db.once('open',()=>{
    console.log("Database Connected")
})
app.use(cors());

app.use(express.json());

// Serve uploads folder statically so files are directly accessible via URL
app.use("/uploads", express.static("uploads"));

app.use(
  "/api/assignments",
  assignmentRoutes
);
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);
app.get("/",(req,res)=>{
    res.send("Ved server is live")
})

app.use(errorHandler);

const PORT= process.env.PORT || 3000

server.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});