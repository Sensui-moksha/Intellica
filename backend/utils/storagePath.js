const path = require("path");
const fs = require("fs");

/**
 * Returns the base root storage directory configured via .env (UPLOAD_DIR or STORAGE_PATH).
 * Defaults to "backend/uploads" if not specified.
 */
function getUploadBaseDir() {
  const customPath = process.env.UPLOAD_DIR || process.env.STORAGE_PATH || "./uploads";
  const baseDir = path.isAbsolute(customPath)
    ? customPath
    : path.resolve(path.join(__dirname, "..", customPath));

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  return baseDir;
}

/**
 * Builds user folder name in the format: <Name>(<Employee_ID>)
 * Example: moksha(CSE-101) or Dr_Sharma(HOD-CSE-01) or admin(admin)
 */
function getUserFolderIdentifier(user) {
  if (!user) return "user(unknown)";
  if (typeof user === "string") {
    return user.trim().replace(/[\s.]+/g, "_").replace(/[^a-zA-Z0-9_()-]/g, "");
  }

  const cleanName = (user.name || user.regId || "User")
    .trim()
    .replace(/[\s.]+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");

  const cleanEmpId = (user.employeeId || user.regId || user.id || "001")
    .trim()
    .replace(/[\s.]+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");

  return `${cleanName}(${cleanEmpId})`;
}

/**
 * Resolves the relative base path for the user within the departments hierarchy.
 * Format:
 *   - Faculty: departments/<DEPARTMENT>/faculty/<Name>(<Employee_ID>)
 *   - HOD:     departments/<DEPARTMENT>/hod/<Name>(<Employee_ID>)
 *   - Admin:   departments/ADMIN/admin(admin)
 */
function getUserBasePath(user) {
  const role = user?.role ? String(user.role).toUpperCase() : "FACULTY";
  const dept = user?.department
    ? String(user.department).trim().toUpperCase().replace(/[^a-zA-Z0-9_-]/g, "_")
    : "GENERAL";

  const userFolder = getUserFolderIdentifier(user);

  if (role === "ADMIN") {
    return path.join("departments", "ADMIN", userFolder);
  }

  if (role === "HOD") {
    return path.join("departments", dept, "hod", userFolder);
  }

  // Default: FACULTY
  return path.join("departments", dept, "faculty", userFolder);
}

/**
 * Returns the absolute directory path on disk for user uploads and creates all parent directories.
 * Structure: <BASE_DIR>/departments/<DEPT>/<hod|faculty>/<Name>(<EmpID>)/<Subfolder>/
 */
function getUserUploadDir(user, subfolder = "") {
  const baseDir = getUploadBaseDir();
  const userBasePath = getUserBasePath(user);
  const cleanSub = subfolder
    ? String(subfolder).trim().replace(/[\s.]+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase()
    : "";

  const targetDir = cleanSub
    ? path.join(baseDir, userBasePath, cleanSub)
    : path.join(baseDir, userBasePath);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  return targetDir;
}

/**
 * Returns the relative path for saving in the Database and static URL serving.
 * Example: "departments/CSE/faculty/moksha(CSE-101)/profile_pic/profile_image.png"
 * Example: "departments/CSE/faculty/moksha(CSE-101)/publication/1786868041-paper.pdf"
 * Example: "departments/CSE/hod/Dr_Ramesh(HOD-01)/profile_pic/profile_image.png"
 */
function getUserRelativePath(user, subfolder, filename) {
  const userBasePath = getUserBasePath(user).replace(/\\/g, "/");
  const cleanSub = subfolder
    ? String(subfolder).trim().replace(/[\s.]+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase()
    : "";

  return cleanSub
    ? `${userBasePath}/${cleanSub}/${filename}`
    : `${userBasePath}/${filename}`;
}

module.exports = {
  getUploadBaseDir,
  getUserFolderIdentifier,
  getUserBasePath,
  getUserUploadDir,
  getUserRelativePath,
};
