const multer = require("multer");
const path = require("path");
const { getUserUploadDir } = require("../utils/storagePath");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Saves in: <UPLOAD_DIR>/intellica/<user_name>/profile_pic/
    const userDir = getUserUploadDir(req.user, "profile_pic");
    cb(null, userDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `profile_image${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false);
    req.fileValidationError = "Only image files (jpg, jpeg, png) are allowed";
  }
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});