import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { ApiResponse } from "../helpers/ApiResponse.js";
import { ApiError } from "../helpers/ApiError.js";

const router = Router();

// Ensure local uploads directory exists (used for local uploads and temp storage for Cloudinary)
const UPLOADS_DIR = "./uploads";
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure Cloudinary supporting both the Z spelling and correct spelling in env
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARZY_CLOUD_NAME || "";
const apiKey = process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARZY_API_KEY || "";
const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARZY_API_SECRET || "";

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter to allow only images and PDFs
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/pdf",
    "text/plain",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, "Invalid file type. Only PNG, JPG, JPEG, WEBP, PDF, and TXT are allowed."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// POST /api/upload
router.post("/", upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) {
    throw ApiError.badRequest("No file uploaded");
  }

  try {
    const activeCloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARZY_CLOUD_NAME;
    const activeApiKey = process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARZY_API_KEY;
    const activeApiSecret = process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARZY_API_SECRET;

    if (activeCloudName && activeApiKey && activeApiSecret) {
      // Configure on-the-fly in case env was loaded late
      cloudinary.config({
        cloud_name: activeCloudName,
        api_key: activeApiKey,
        api_secret: activeApiSecret,
      });

      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "ved_ai_uploads",
        resource_type: "auto", // Auto detects images, PDFs, etc.
      });

      // Delete the local temp file after upload succeeds
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return ApiResponse.ok(
        {
          fileName: req.file.originalname,
          fileUrl: uploadResult.secure_url,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
        "File uploaded successfully to Cloudinary"
      ).send(res);
    }

    // Fallback: Local static serving URL
    const protocol = req.protocol;
    const host = req.get("host");
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    return ApiResponse.ok(
      {
        fileName: req.file.originalname,
        fileUrl,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
      "File uploaded successfully (local storage fallback)"
    ).send(res);
  } catch (err: any) {
    // Clean up local temp file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Cloudinary upload error:", err);
    
    // Fallback to local static serving on Cloudinary upload failure
    if (req.file && fs.existsSync(req.file.path)) {
      const protocol = req.protocol;
      const host = req.get("host");
      const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
      return ApiResponse.ok(
        {
          fileName: req.file.originalname,
          fileUrl,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
        "Cloudinary upload failed, fell back to local storage"
      ).send(res);
    }
    
    throw new ApiError(500, `Upload failed: ${err.message || err}`);
  }
});

export default router;
