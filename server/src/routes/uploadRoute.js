import express from "express";
import multer from "multer";
import { initUpload, chunkReceiver } from "../controllers/uploadController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/init", initUpload);
router.post("/chunk", upload.single("chunk"), chunkReceiver);

export default router;
