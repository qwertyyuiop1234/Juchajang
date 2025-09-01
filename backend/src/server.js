import express from "express";
import cors from "cors";
import { ENV } from "./config/env.js";
import navigationRoutes from "./routes/navigation.js";
import parkingRoutes from "./routes/parking.js";
import usersRoutes from "./routes/users.js";

const PORT = ENV.PORT;
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true });
});

app.use("/api/navigation", navigationRoutes);
app.use("/api/parking", parkingRoutes);
app.use("/api/users", usersRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log("Express server running on PORT : ", PORT);
  console.log("Server accessible from ALL network interfaces");
});

// 예외 처리 추가
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// 서버가 계속 실행되는지 확인
setInterval(() => {
  console.log("서버 실행 중...", new Date().toLocaleTimeString());
}, 10000);
