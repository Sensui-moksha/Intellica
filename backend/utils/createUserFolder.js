const fs = require("fs");
const path = require("path");

function createUserFolder(role, userId) {

  const basePath = path.join(__dirname, "../uploads");

  let folderPath;

  if (role === "faculty") {
    folderPath = path.join(basePath, "faculty", `faculty_${userId}`);
  }

  if (role === "hod") {
    folderPath = path.join(basePath, "hod", `hod_${userId}`);
  }

  if (role === "admin") {
    folderPath = path.join(basePath, "admin");
  }

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  return folderPath;
}

module.exports = createUserFolder;