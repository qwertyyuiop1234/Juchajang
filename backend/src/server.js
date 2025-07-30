import express from "express";
import { ENV } from "./config/env.js";

const PORT = ENV.PORT;
const app = express();

app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true });
});

app.listen(PORT, () => {
  console.log("Express server running on PORT : ", PORT);
});
