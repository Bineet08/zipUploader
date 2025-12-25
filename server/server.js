import express from "express";
import uploadRoutes from "./src/routes/uploadRoute.js";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import { cleanupStaleUploads } from "./src/services/cleanupService.js"

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.CLIENT || "http://localhost:5173",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));


app.use(express.json());
app.use("/upload", uploadRoutes);

async function startCleanupJob() {
  for (let i = 0; i < 5; i++) {
    try {
       await cleanupStaleUploads();
      console.log("Cleanup job started");
      return;
    } catch (err) {
      console.warn("Waiting for DB before cleanup...");
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  console.error("Cleanup job failed after retries");
}

startCleanupJob();


app.listen(PORT, () => {
  console.log(`Backend running on port: ${PORT}`);
});
