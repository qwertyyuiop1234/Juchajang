import express from "express";
import cors from "cors";
import { ENV } from "./config/env.js";
import navigationRoutes from "./routes/navigation.js";
import parkingRoutes from "./routes/parking.js";
import reviewRoutes from "./routes/review.js";
import usersRoutes from "./routes/users.js";

// 라우트 import 확인
console.log("📦 Import 확인:");
console.log("  navigationRoutes:", typeof navigationRoutes);
console.log("  parkingRoutes:", typeof parkingRoutes);
console.log("  reviewRoutes:", typeof reviewRoutes);
console.log("  usersRoutes:", typeof usersRoutes);

const PORT = ENV.PORT;
const app = express();

// 🔍 모든 요청 로깅 (가장 먼저!)
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  console.log("  ✓ Health 체크");
  res.status(200).json({ success: true });
});

console.log("🔧 라우터 등록 시작...");

app.use("/api/navigation", navigationRoutes);
app.use("/api/parking", parkingRoutes);
app.use("/api/review", reviewRoutes);
app.use("/api/users", usersRoutes);

// 등록된 라우트 확인
console.log("✅ 등록된 라우트:");
console.log("  - /api/navigation");
console.log("  - /api/parking");
console.log("  - /api/review");
console.log("  - /api/users");

// 404 핸들러 (모든 라우트 뒤에)
app.use((req, res) => {
  console.log("❌ 404 핸들러 실행:", req.method, req.path);
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

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
