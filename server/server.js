import express from "express";
import uploadRoutes from "./src/routes/uploadRoute.js";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import { cleanupStaleUploads } from "./src/services/cleanupService.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.CLIENT || "http://localhost:5173",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));


app.use(express.json());
app.use("/upload", uploadRoutes);

cleanupStaleUploads();
setInterval(cleanupStaleUploads, 60 * 60 * 1000);

app.listen(PORT, () => {
    console.log(`Backend running on port: ${PORT}`);
});
