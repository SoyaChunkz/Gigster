import { io } from "socket.io-client";
import { BACKEND_URL } from "@/utils";

const socket = io(BACKEND_URL);

socket.on("connect", () => {
    console.log("Connected to WebSocket server:", socket.id);
});

socket.on("disconnect", () => {
    console.log("Disconnected from WebSocket server.");
});

export default socket;
