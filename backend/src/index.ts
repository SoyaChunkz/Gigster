import express from "express";
import userRouter from "./routers/user";
import workerRouter from "./routers/worker";

const app = express();

app.use(express.json());

  
app.use("/user", userRouter);
app.use("/worker", workerRouter);

app.listen(3000, () => {
    console.log(`Server is listing on port 3000`);
  });