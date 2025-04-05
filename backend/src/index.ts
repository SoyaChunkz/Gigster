import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import userRouter from "./routers/user";
import workerRouter from "./routers/worker";
import cors from "cors";

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
      origin: "*", 
      methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(express.json());
app.use(cors());

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => { 
      console.log("Client disconnected:", socket.id);
  });
});
  
// @ts-ignore
app.use("/user", userRouter(io));
// @ts-ignore
app.use("/worker", workerRouter(io));

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});