import express from "express";
import multer from "multer";
import { initUpload, chunkReceiver, uploadStatus } from "../controllers/uploadController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/init", initUpload);
router.post("/chunk", upload.single("chunk"), chunkReceiver);
router.get("/status", uploadStatus);


export default router;
