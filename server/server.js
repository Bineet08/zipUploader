import express from "express";
import uploadRoutes from "./src/routes/uploadRoute.js";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 4000;
app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());
app.use("/upload", uploadRoutes);

app.listen(4000, () => {
    console.log(`Backend running on port: ${PORT}`);
});
