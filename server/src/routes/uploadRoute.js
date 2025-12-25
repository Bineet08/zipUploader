import express from "express";
import multer from "multer";
import {
  initUpload,
  chunkReceiver,
  uploadStatus
} from "../controllers/uploadController.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage()
});

router.post("/init", initUpload);
router.get("/status", uploadStatus);

router.post("/chunk", upload.single("chunk"), chunkReceiver);

export default router;
