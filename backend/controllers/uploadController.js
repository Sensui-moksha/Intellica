const Upload = require("../models/Upload");
const Category = require("../models/Category");
const calculateCredits = require("../services/creditCalculator");
const path = require("path");
const fs = require("fs");
const { getUploadBaseDir } = require("../utils/storagePath");
const Notification = require("../models/Notification");



exports.createUpload = async (req, res) => {
try {
  if (!["FACULTY","HOD","ADMIN"].includes(req.user.role)) {
 return res.status(403).json({ message: "Not allowed to upload" });
}
const body = { ...req.body };
Object.keys(body).forEach(key => {
  if (Array.isArray(body[key])) { body[key] = body[key][0]; }
});

const category = (req.params.category || "").trim().replace(/[^a-zA-Z0-9_\-]/g, "");
if (!category) {
  return res.status(400).json({ message: "Invalid category" });
}
// Escape category for use in RegExp (prevents ReDoS)
const escapedCategory = category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const validCategory = await Category.findOne({ name: new RegExp('^' + escapedCategory + '$', 'i'), isActive: true });
if (!validCategory) {
  return res.status(400).json({ message: "Invalid or inactive category" });
}
let title = (body.title || "").trim();
if (!title) {
  if (category.toLowerCase() === "mou") {
    title = body.organization ? `MoU Agreement - ${body.organization}${body.mouType ? " (" + body.mouType + ")" : ""}` : `MoU Partnership (${req.user.department || "Academic"})`;
  } else if (category.toLowerCase() === "doctoralthesis") {
    let names = [];
    try {
      const guided = JSON.parse(body.guidedDetails || "[]");
      guided.forEach(g => { if (g.scholarName) names.push(g.scholarName + (g.university ? " (" + g.university + ")" : "")); });
    } catch(e) {}
    title = names.length > 0 ? `Doctoral Thesis Guidance - ${names.join(", ")}` : `Doctoral Thesis Guidance (${req.user.department || "Academic"})`;
  } else {
    title = body.paperTitle || body.thesisTopic || body.projectTitle || body.patentTitle || body.bookTitle || body.courseName || body.fdpTitle || body.workshopTitle || body.seminarTitle || body.webinarTitle || body.name || body.topic || `${category} Record`;
  }
}
const metadata = { ...body };
delete metadata.title;
delete metadata.category;
delete metadata.faculty;
delete metadata.credits;
let relativePath="";
if(req.files && req.files.length>0){
  const mainFile = req.files.find(f=>f.fieldname==="file" || f.fieldname==="document") || req.files[0];
  if(mainFile && fs.existsSync(mainFile.path)){
    const dir = path.dirname(mainFile.path);
    const ext = path.extname(mainFile.path) || ".pdf";
    const cleanBase = (title || "document").replace(/[^a-zA-Z0-9_\- ]/g, "").trim().replace(/\s+/g, "_").slice(0, 100) || "document";
    let targetName = `${cleanBase}${ext}`;
    let targetPath = path.join(dir, targetName);
    let counter = 1;
    while (fs.existsSync(targetPath) && targetPath !== mainFile.path) {
      targetName = `${cleanBase}_${counter}${ext}`;
      targetPath = path.join(dir, targetName);
      counter++;
    }
    if (mainFile.path !== targetPath) {
      fs.renameSync(mainFile.path, targetPath);
    }
    relativePath = path.relative(getUploadBaseDir(), targetPath).replace(/\\/g,"/");
  }
}

const subcategory = (body.subcategory || metadata.subcategory || "").trim();

const credits = await calculateCredits({ category, metadata, subcategory });

const yearValue = String(body.year || "").trim();
let year = parseInt(yearValue, 10);
if (isNaN(year)) {
  const meta = { ...body };
  if (meta.monthYear)        year = parseInt(meta.monthYear.split("-")[0], 10);
  else if (meta.fromDate)    year = new Date(meta.fromDate).getFullYear();
  else if (meta.date)        year = new Date(meta.date).getFullYear();
  else if (meta.toDate)      year = new Date(meta.toDate).getFullYear();
  else if (meta.startDate)   year = new Date(meta.startDate).getFullYear();
  else if (meta.publishedDate)  year = new Date(meta.publishedDate).getFullYear();
  else if (meta.completionDate) year = new Date(meta.completionDate).getFullYear();
  else {
    return res.status(400).json({ message: "Year is required" });
  }
}
let status;
if(req.user.role === "FACULTY"){ status = "FACULTY_SUBMITTED"; }
if(req.user.role === "HOD"){ status = "HOD_SUBMITTED"; }
if(req.user.role === "ADMIN"){ status = "ADMIN_APPROVED"; }
const upload = await Upload.create({
faculty: req.user.id,
createdByRole: req.user.role,
department: req.user.department || "",
category, subcategory, title, metadata, credits, year:year,
filePath: relativePath, status
});

// Trigger Notification for Reviewers
if (req.user.role === "FACULTY") {
  await Notification.create({
    message: `New activity submission: "${title}" by ${req.user.name || "Faculty"} (${req.user.department || "Academic"}). Awaiting HOD review.`,
    role: "HOD"
  }).catch(() => {});
} else if (req.user.role === "HOD") {
  await Notification.create({
    message: `HOD (${req.user.name || "HOD"}) submitted activity: "${title}" (${req.user.department || "Academic"}). Awaiting Admin review.`,
    role: "ADMIN"
  }).catch(() => {});
}

res.status(201).json({ message:"Upload submitted successfully", upload });

}catch(err){
  console.error("CREATE UPLOAD ERROR:", err);
  res.status(500).json({ message: err.message || "Upload failed" });
}
};

exports.getMyUploads = async(req,res)=>{
try{
const userId = req.user.id;
const uploads = await Upload.find({ faculty:userId }).sort({createdAt:-1});
res.json(uploads);
}catch(err){
console.error(err);
res.status(500).json({ message:"Fetch failed" });
}
};

exports.updateUpload = async (req, res) => {
try {
const uploadDoc = await Upload.findById(req.params.id);
if(!uploadDoc){ return res.status(404).json({message:"Upload not found"}); }
const userId = req.user.id;
if(uploadDoc.faculty.toString() !== userId){
return res.status(403).json({message:"Not allowed"});
}
const body = { ...req.body };
Object.keys(body).forEach(key => {
if (Array.isArray(body[key])) { body[key] = body[key][0]; }
});
const category = req.params.category;
let title = body.title || "";
if (category === "mou" && !title) { title = body.organization || ""; }
const metadata = { ...(uploadDoc.metadata || {}) };
Object.keys(body).forEach(key => {
  if(key === "title") return;
  const value = body[key];
  if(value !== "" && value !== null && value !== undefined){ metadata[key] = value; }
});
const changedFields = [];
const oldMetadata = uploadDoc.metadata || {};
const allKeys = new Set([...Object.keys(oldMetadata), ...Object.keys(metadata)]);
allKeys.forEach(key => {
const oldValue = (oldMetadata[key] ?? "").toString().trim();
const newValue = (metadata[key] ?? "").toString().trim();
if(oldValue !== newValue){ changedFields.push(key); }
});
if((uploadDoc.title || "").toString().trim() !== title.toString().trim()){
changedFields.push("title");
}
const subcategory = (body.subcategory || metadata.subcategory || uploadDoc.subcategory || "").trim();
uploadDoc.subcategory = subcategory;
uploadDoc.previousMetadata = { ...oldMetadata };
uploadDoc.metadata = metadata;
uploadDoc.changedFields = changedFields;
uploadDoc.credits = await calculateCredits({ category, metadata, subcategory });
uploadDoc.category = category;
uploadDoc.title = title;

if (body.year !== undefined && body.year !== null && body.year !== "") {
  const yearValue = String(body.year).trim();
  const parsedYear = parseInt(yearValue, 10);
  if (!isNaN(parsedYear)) {
    uploadDoc.year = parsedYear;
  }
}
if(req.user.role === "FACULTY"){ uploadDoc.status = "FACULTY_SUBMITTED"; }
if(req.user.role === "HOD"){ uploadDoc.status = "HOD_SUBMITTED"; }
if(req.files && req.files.length>0){
  let mainFile = req.files.find(f => f.fieldname === "file" || f.fieldname === "document") || req.files[0];
  if(mainFile && fs.existsSync(mainFile.path)){
    const dir = path.dirname(mainFile.path);
    const ext = path.extname(mainFile.path) || ".pdf";
    const cleanBase = (title || uploadDoc.title || "document").replace(/[^a-zA-Z0-9_\- ]/g, "").trim().replace(/\s+/g, "_").slice(0, 100) || "document";
    let targetName = `${cleanBase}${ext}`;
    let targetPath = path.join(dir, targetName);
    let counter = 1;
    while (fs.existsSync(targetPath) && targetPath !== mainFile.path) {
      targetName = `${cleanBase}_${counter}${ext}`;
      targetPath = path.join(dir, targetName);
      counter++;
    }
    if (mainFile.path !== targetPath) {
      fs.renameSync(mainFile.path, targetPath);
    }
    const relativePath = path.relative(getUploadBaseDir(), targetPath).replace(/\\/g, "/");
    uploadDoc.filePath = relativePath;
  }
}
await uploadDoc.save();
res.json({ message:"Upload updated and resubmitted for review successfully", upload: uploadDoc });
}catch(err){
  console.error("UPDATE UPLOAD ERROR:", err);
  res.status(500).json({ message: err.message || "Update failed" });
}
};

exports.getPendingUploadsForHOD = async(req,res)=>{
try{
if(req.user.role!=="HOD"){
return res.status(403).json({message:"Access denied"});
}
const uploads = await Upload.find({
department:req.user.department,
status:"FACULTY_SUBMITTED"
})
.populate("faculty","name employeeId department role")
.sort({createdAt:-1});
res.json(uploads);
}catch(err){
console.error(err);
res.status(500).json({ message:"Error fetching uploads" });
}
};

exports.approveUploadByHOD = async(req,res)=>{
try{
if(req.user.role!=="HOD"){
return res.status(403).json({message:"Access denied"});
}
const uploadDoc = await Upload.findById(req.params.id);
if(!uploadDoc){ return res.status(404).json({message:"Upload not found"}); }
if(uploadDoc.department !== req.user.department){
return res.status(403).json({message:"Access denied (Different department)"});
}
uploadDoc.status="HOD_APPROVED";
uploadDoc.adminComment = "";
uploadDoc.hodComment = "";
uploadDoc.discussionComments = "";
uploadDoc.rejectionReason = "";
uploadDoc.rejectedBy = "";
uploadDoc.rejectedAt = null;
await uploadDoc.save();

await Notification.create({
  message: `Upload "${uploadDoc.title}" (${uploadDoc.department}) was approved by HOD (${req.user.name || "HOD"}). Awaiting Admin verification.`,
  role: "ADMIN"
}).catch(() => {});

await Notification.create({
  message: `Your upload "${uploadDoc.title}" has been approved by your HOD (${req.user.name || "HOD"}).`,
  role: "FACULTY"
}).catch(() => {});

res.json({ message:"Approved by HOD" });

}catch(err){
console.error(err);
res.status(500).json({ message:"Approval failed" });
}
};

/* HOD REJECT UPLOAD */
exports.rejectUploadByHOD = async (req, res) => {
  try {
    if (req.user.role !== "HOD") {
      return res.status(403).json({ message: "Access denied" });
    }
    const uploadDoc = await Upload.findById(req.params.id);
    if (!uploadDoc) { return res.status(404).json({ message: "Upload not found" }); }
    if (uploadDoc.department !== req.user.department) {
      return res.status(403).json({ message: "Access denied (Different department)" });
    }
    uploadDoc.status = "HOD_REJECTED";
    uploadDoc.hodComment = req.body.reason || "Rejected by HOD";
    uploadDoc.rejectionReason = req.body.reason || "Rejected by HOD";
    uploadDoc.rejectedBy = `HOD (${req.user.name || "HOD"})`;
    uploadDoc.rejectedAt = new Date();
    await uploadDoc.save();

    await Notification.create({
      message: `Your upload "${uploadDoc.title}" was rejected by HOD (${req.user.name || "HOD"}): ${uploadDoc.hodComment}`,
      role: "FACULTY"
    }).catch(() => {});

    res.json({ message: "Document rejected by HOD", upload: uploadDoc });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "HOD rejection failed" });
  }
};

/* GET APPROVED UPLOADS FOR HOD */
exports.getApprovedUploadsForHOD = async (req, res) => {
  try {
    if (req.user.role !== "HOD") {
      return res.status(403).json({ message: "Access denied" });
    }
    const uploads = await Upload.find({
      department: req.user.department,
      status: { $in: ["HOD_APPROVED", "HOD_SUBMITTED", "ADMIN_APPROVED"] }
    })
      .populate("faculty", "name employeeId department role")
      .sort({ updatedAt: -1 });
    res.json(uploads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching approved uploads" });
  }
};

/* GET REJECTED UPLOADS FOR HOD */
exports.getRejectedUploadsForHOD = async (req, res) => {
  try {
    if (req.user.role !== "HOD") {
      return res.status(403).json({ message: "Access denied" });
    }
    const uploads = await Upload.find({
      department: req.user.department,
      status: { $in: ["HOD_REJECTED", "ADMIN_REJECTED", "REJECTED"] }
    })
      .populate("faculty", "name employeeId department role")
      .sort({ updatedAt: -1 });
    res.json(uploads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching rejected uploads" });
  }
};

exports.getPendingUploadsForAdmin = async(req,res)=>{
try{
if(req.user.role!=="ADMIN"){
return res.status(403).json({message:"Access denied"});
}
    const uploads = await Upload.find({
      status: { $in: ["HOD_SUBMITTED", "HOD_APPROVED", "ADMIN_COMMENT"] }
    })
.populate("faculty","name employeeId department role")
.sort({createdAt:-1});
res.json(uploads);
}catch(err){
console.error(err);
res.status(500).json({ message:"Error fetching uploads" });
}
};

exports.approveUploadByAdmin = async(req,res)=>{
try{
if(req.user.role!=="ADMIN"){
return res.status(403).json({message:"Access denied"});
}
const uploadDoc = await Upload.findById(req.params.id);
if(!uploadDoc){ return res.status(404).json({message:"Upload not found"}); }
uploadDoc.status="ADMIN_APPROVED";
uploadDoc.adminComment = "";
uploadDoc.hodComment = "";
uploadDoc.discussionComments = "";
uploadDoc.rejectionReason = "";
uploadDoc.rejectedBy = "";
uploadDoc.rejectedAt = null;
await uploadDoc.save();

await Notification.create({
  message: `Your upload "${uploadDoc.title}" has been verified and awarded ${uploadDoc.credits || 0} credits by the Administrator.`,
  role: "FACULTY"
}).catch(() => {});

await Notification.create({
  message: `Upload "${uploadDoc.title}" (${uploadDoc.department}) has been verified and approved by Administrator.`,
  role: "HOD"
}).catch(() => {});

res.json({ message:"Upload approved by admin" });

}catch(err){
console.error(err);
res.status(500).json({ message:"Admin approval failed" });
}
};

/* ADMIN REJECT UPLOAD */
exports.rejectUploadByAdmin = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }
    const uploadDoc = await Upload.findById(req.params.id);
    if (!uploadDoc) { return res.status(404).json({ message: "Upload not found" }); }
    uploadDoc.status = "ADMIN_REJECTED";
    uploadDoc.adminComment = req.body.reason || "Rejected by Admin";
    uploadDoc.rejectionReason = req.body.reason || "Rejected by Admin";
    uploadDoc.rejectedBy = `Admin (${req.user.name || "Admin"})`;
    uploadDoc.rejectedAt = new Date();
    await uploadDoc.save();

    await Notification.create({
      message: `Your upload "${uploadDoc.title}" was rejected by Administrator: ${uploadDoc.adminComment}`,
      role: "FACULTY"
    }).catch(() => {});

    res.json({ message: "Document rejected by Admin", upload: uploadDoc });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Admin rejection failed" });
  }
};

/* GET APPROVED UPLOADS FOR ADMIN */
exports.getApprovedUploadsForAdmin = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }
    const uploads = await Upload.find({
      status: "ADMIN_APPROVED"
    })
      .populate("faculty", "name employeeId department role")
      .sort({ updatedAt: -1 });
    res.json(uploads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching approved uploads" });
  }
};

/* GET REJECTED UPLOADS FOR ADMIN */
exports.getRejectedUploadsForAdmin = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }
    const uploads = await Upload.find({
      status: { $in: ["ADMIN_REJECTED", "HOD_REJECTED", "REJECTED"] }
    })
      .populate("faculty", "name employeeId department role")
      .sort({ updatedAt: -1 });
    res.json(uploads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching rejected uploads" });
  }
};

/* REOPEN / MOVE BACK TO PENDING / REVALIDATE */
exports.reopenUpload = async (req, res) => {
  try {
    if (!["ADMIN", "HOD"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const uploadDoc = await Upload.findById(req.params.id);
    if (!uploadDoc) {
      return res.status(404).json({ message: "Upload not found" });
    }

    if (req.user.role === "HOD") {
      uploadDoc.status = "FACULTY_SUBMITTED";
      uploadDoc.rejectionReason = "";
      uploadDoc.rejectedBy = "";
      uploadDoc.rejectedAt = null;
    } else if (req.user.role === "ADMIN") {
      uploadDoc.status = "HOD_SUBMITTED";
      uploadDoc.rejectionReason = "";
      uploadDoc.rejectedBy = "";
      uploadDoc.rejectedAt = null;
    }

    await uploadDoc.save();
    res.json({ message: "Upload moved back to pending review", upload: uploadDoc });
  } catch (err) {
    console.error("REOPEN UPLOAD ERROR:", err);
    res.status(500).json({ message: "Failed to reopen upload" });
  }
};

exports.callForDiscussion = async(req,res)=>{
try{
if(!["HOD","ADMIN"].includes(req.user.role)){
return res.status(403).json({message:"Not allowed"});
}
const uploadDoc = await Upload.findById(req.params.id);
if(!uploadDoc){ return res.status(404).json({message:"Upload not found"}); }
if(req.user.role === "HOD" && uploadDoc.department !== req.user.department){
  return res.status(403).json({message:"Access denied (Different department)"});
}
if(req.user.role === "HOD"){
uploadDoc.hodComment = req.body.comment || "";
uploadDoc.status = req.body.needsRevision ? "NEEDS_REVISION" : "HOD_COMMENT";
}
if(req.user.role === "ADMIN"){
uploadDoc.adminComment = req.body.comment || "";
uploadDoc.status = req.body.needsRevision ? "NEEDS_REVISION" : "ADMIN_COMMENT";
}
await uploadDoc.save();

await Notification.create({
  message: `${req.user.role === "HOD" ? `HOD (${req.user.name || "HOD"})` : "Administrator"} added a review comment on "${uploadDoc.title}"${req.body.needsRevision ? " (Revision Requested)" : ""}: ${req.body.comment || ""}`,
  role: "FACULTY"
}).catch(() => {});

res.json({ message:"Comment added", upload:uploadDoc });

}catch(err){
console.error(err);
res.status(500).json({ message:"Discussion failed" });
}
};

exports.getUploadsByCategory = async (req, res) => {
try {
const { category, facultyId } = req.query;
let targetUser;
if (facultyId) { targetUser = facultyId; }
else { targetUser = req.user.id; }
const uploads = await Upload.find({
  category, faculty: targetUser
}).sort({ createdAt: -1 });
res.json(uploads);
} catch (err) {
console.error(err);
res.status(500).json({ message: "Fetch failed" });
}
};

exports.getFacultyUploads = async (req, res) => {
  try {
    const facultyId = req.params.facultyId;
    const upload = await Upload.findOne({ faculty: facultyId });
    if (!upload) {
      return res.status(404).json({ message: "No uploads found" });
    }
    if (req.user.role === "HOD" && upload.department !== req.user.department) {
      return res.status(403).json({ message: "Access denied" });
    }
    const uploads = await Upload.find({
      faculty: facultyId,
      createdByRole: { $in: ["FACULTY", "HOD"] }
    }).sort({ createdAt: -1 });
    res.json(uploads);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getDepartmentUploads = async (req, res) => {
  try {
    if (!["HOD", "ADMIN"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    let query = {
      status: {
        $in: ["FACULTY_SUBMITTED","HOD_SUBMITTED","HOD_APPROVED","ADMIN_APPROVED"]
      }
    };
    if (req.user.role === "HOD") {
      query.department = req.user.department;
    } else if (req.user.role === "ADMIN" && req.query.department) {
      query.department = req.query.department;
    }
    console.log("Role:", req.user.role);
    console.log("Query:", JSON.stringify(query));
    const uploads = await Upload.find(query).sort({ createdAt: -1 });
    console.log("Found:", uploads.length);
    const Faculty = require("../models/Faculty");
    const HOD = require("../models/HOD");
    const formattedUploads = await Promise.all(
      uploads.map(async (upload) => {
        let user;
        if (upload.createdByRole === "FACULTY") {
          user = await Faculty.findById(upload.faculty).select("name employeeId");
        }
        if (upload.createdByRole === "HOD") {
          user = await HOD.findById(upload.faculty).select("name employeeId");
        }
        return { ...upload.toObject(), faculty: user };
      })
    );
    res.json(formattedUploads);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   GET DEPARTMENT RANK
===================================================== */

exports.getDepartmentRank = async (req, res) => {
  try {
    if (req.user.role !== "HOD") {
      return res.status(403).json({ message: "Access denied" });
    }

     
    const allUploads = await Upload.find({
      status: { $in: ["HOD_APPROVED", "ADMIN_APPROVED"] }
    });

    // Department wise credits sum 
    const deptCredits = {};
    allUploads.forEach(u => {
      const dept = u.department || "Unknown";
      deptCredits[dept] = (deptCredits[dept] || 0) + (u.credits || 0);
    });

    
    const sorted = Object.entries(deptCredits).sort((a, b) => b[1] - a[1]);

    const myDept = req.user.department;
    const rank = sorted.findIndex(([dept]) => dept === myDept) + 1;
    const totalDepts = sorted.length;

    res.json({
      rank: rank > 0 ? rank : null,
      totalDepts,
      myDept
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};