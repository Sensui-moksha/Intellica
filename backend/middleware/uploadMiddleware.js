const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { getUserUploadDir, getUploadBaseDir } = require("../utils/storagePath");

/* ================= BASE UPLOAD FOLDER ================= */
const baseUploadDir = getUploadBaseDir();
const tempDir = path.join(baseUploadDir, "temp");

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/* ================= STORAGE CONFIG ================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Dynamic routing: <UPLOAD_DIR>/intellica/<User_Folder>/<Category>/
    const category = req.params.category || "general";
    const userDir = getUserUploadDir(req.user, category);
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const rawTitle = req.body?.title || req.body?.bookTitle || req.body?.paperTitle || path.parse(file.originalname).name;
    const cleanTitle = (rawTitle || "document")
      .replace(/[^a-zA-Z0-9_\- ]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 100) || "document";
    const ext = path.extname(file.originalname) || ".pdf";
    cb(null, `${cleanTitle}_${Date.now()}${ext}`);
  }
});

/* ================= FILE FILTER ================= */
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf" || file.mimetype.startsWith("image/") || file.originalname.match(/\.(pdf|docx?|png|jpe?g)$/i)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOCX, or Image files allowed"), false);
  }
};

/* ================= MULTER INSTANCE ================= */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  }
});

module.exports = upload;
