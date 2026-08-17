const Upload = require("../models/Upload");
const Category = require("../models/Category");
const Faculty = require("../models/Faculty");
const calculateCredits = require("../services/creditCalculator");
const path = require("path");
const fs = require("fs");
const { getUploadBaseDir } = require("../utils/storagePath");
const Notification = require("../models/Notification");
const { emitToRole, emitToUser, emitToDepartment, broadcastEvent } = require("../utils/socket");
const { sendFacultyNotificationEmail } = require("../utils/emailService");



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
if(req.user.role === "HOD"){ status = "APPROVED"; }
if(req.user.role === "ADMIN"){ status = "APPROVED"; }
const upload = await Upload.create({
faculty: req.user.id,
createdByRole: req.user.role,
department: req.user.department || "",
category, subcategory, title, metadata, credits, year:year,
filePath: relativePath, status
});

// Trigger Notification & Real-time WebSocket Push
if (req.user.role === "FACULTY") {
  const notif = await Notification.create({
    message: `New activity submission: "${title}" by ${req.user.name || "Faculty"} (${req.user.department || "Academic"}). Awaiting HOD review.`,
    role: "HOD",
    department: req.user.department || "",
    type: "SUBMISSION",
    uploadId: upload._id
  }).catch(() => {});
  if (notif) emitToDepartment(req.user.department, "notification:new", notif);
  emitToDepartment(req.user.department, "approvals:update", { action: "NEW_SUBMISSION", upload });
} else if (req.user.role === "HOD") {
  const notif = await Notification.create({
    message: `HOD (${req.user.name || "HOD"}) uploaded activity: "${title}" (${req.user.department || "Academic"}). Approved and awarded ${credits} credits.`,
    role: "ADMIN",
    type: "SUBMISSION",
    uploadId: upload._id
  }).catch(() => {});
  if (notif) emitToRole("ADMIN", "notification:new", notif);
  emitToRole("ADMIN", "approvals:update", { action: "NEW_SUBMISSION", upload });
  broadcastEvent("sync:credits", { department: req.user.department });
}

broadcastEvent("sync:approvals", { action: "NEW_SUBMISSION", id: upload._id });

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

const category = (req.params.category || uploadDoc.category || "").trim().replace(/[^a-zA-Z0-9_\-]/g, "");
if (!category) {
  return res.status(400).json({ message: "Invalid category" });
}
const escapedCat = category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const validCat = await Category.findOne({ name: new RegExp('^' + escapedCat + '$', 'i'), isActive: true });
if (!validCat) {
  return res.status(400).json({ message: "Invalid or inactive category" });
}

let title = (body.title || "").trim();
if (!title) {
  title = body.paperTitle || body.thesisTopic || body.projectTitle || body.patentTitle || body.bookTitle || body.courseName || body.fdpTitle || body.workshopTitle || body.seminarTitle || body.webinarTitle || body.name || body.topic || uploadDoc.title;
}

const metadata = { ...body };
delete metadata.title;
delete metadata.category;
delete metadata.faculty;
delete metadata.credits;

const subcategory = (body.subcategory || metadata.subcategory || uploadDoc.subcategory || "").trim();
const credits = await calculateCredits({ category, metadata, subcategory });

const yearVal = String(body.year || uploadDoc.year || "").trim();
let year = parseInt(yearVal, 10);
if (isNaN(year)) {
  year = new Date().getFullYear();
}

uploadDoc.category = category;
uploadDoc.subcategory = subcategory;
uploadDoc.title = title;
uploadDoc.metadata = metadata;
uploadDoc.credits = credits;
uploadDoc.year = year;
uploadDoc.status = "FACULTY_SUBMITTED"; // resubmitted for review
uploadDoc.rejectionReason = "";
uploadDoc.rejectedBy = "";
uploadDoc.rejectedAt = null;

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

/* GET PENDING UPLOADS FOR HOD */
exports.getPendingUploadsForHOD = async(req,res)=>{
try{
if(req.user.role!=="HOD"){
return res.status(403).json({message:"Access denied"});
}
const uploads = await Upload.find({
department:req.user.department,
status: { $in: ["FACULTY_SUBMITTED", "PENDING", "HOD_COMMENT", "NEEDS_REVISION", "REOPENED_FOR_HOD"] }
})
.populate("faculty","name employeeId department role")
.sort({updatedAt:-1, createdAt:-1});
res.json(uploads);
}catch(err){
console.error(err);
res.status(500).json({ message:"Error fetching uploads" });
}
};

/* HOD FINAL APPROVE UPLOAD */
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
uploadDoc.status="APPROVED";
uploadDoc.adminComment = "";
uploadDoc.hodComment = "";
uploadDoc.discussionComments = "";
uploadDoc.rejectionReason = "";
uploadDoc.rejectedBy = "";
uploadDoc.rejectedAt = null;
await uploadDoc.save();

    const notifFac = await Notification.create({
      message: `Your submission "${uploadDoc.title}" has been approved by your HOD (${req.user.name || "HOD"}) and awarded ${uploadDoc.credits || 0} credits.`,
      userId: uploadDoc.faculty,
      role: "FACULTY",
      type: "APPROVAL",
      uploadId: uploadDoc._id
    }).catch(() => {});
    if (notifFac) emitToUser(uploadDoc.faculty, "notification:new", notifFac);
    emitToUser(uploadDoc.faculty, "approvals:update", { action: "APPROVED", upload: uploadDoc });

    broadcastEvent("sync:approvals", { action: "APPROVED", id: uploadDoc._id });
    broadcastEvent("sync:credits", { department: uploadDoc.department });

    // Email faculty about final HOD approval (non-blocking)
    Promise.resolve().then(async () => {
      try {
        const fac = await Faculty.findById(uploadDoc.faculty).select('name email').lean();
        if (fac) await sendFacultyNotificationEmail(fac, uploadDoc.title, 'APPROVED', `HOD (${req.user.name || 'HOD'})`, null, uploadDoc.credits);
      } catch (e) { console.error('[EMAIL] HOD approval notification failed:', e.message); }
    });

    res.json({ message:"Upload approved successfully by HOD", upload: uploadDoc });

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
    const reason = req.body.reason || "Rejected by HOD";
    uploadDoc.status = "REJECTED";
    uploadDoc.hodComment = reason;
    uploadDoc.rejectionReason = reason;
    uploadDoc.rejectedBy = `HOD (${req.user.name || "HOD"})`;
    uploadDoc.rejectedAt = new Date();
    await uploadDoc.save();

    const notif = await Notification.create({
      message: `Your upload "${uploadDoc.title}" was rejected by HOD (${req.user.name || "HOD"}): ${uploadDoc.hodComment}`,
      userId: uploadDoc.faculty,
      role: "FACULTY",
      type: "REJECTION",
      uploadId: uploadDoc._id
    }).catch(() => {});
    if (notif) emitToUser(uploadDoc.faculty, "notification:new", notif);
    emitToUser(uploadDoc.faculty, "approvals:update", { action: "REJECTED", upload: uploadDoc });

    broadcastEvent("sync:approvals", { action: "REJECTED", id: uploadDoc._id });
    broadcastEvent("sync:credits", { department: uploadDoc.department });

    // Email faculty about HOD rejection (non-blocking)
    Promise.resolve().then(async () => {
      try {
        const fac = await Faculty.findById(uploadDoc.faculty).select('name email').lean();
        if (fac) await sendFacultyNotificationEmail(fac, uploadDoc.title, 'REJECTED', `HOD (${req.user.name || 'HOD'})`, uploadDoc.hodComment);
      } catch (e) { console.error('[EMAIL] HOD rejection notification failed:', e.message); }
    });

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
      status: { $in: ["APPROVED", "HOD_APPROVED", "ADMIN_APPROVED"] }
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
      status: { $in: ["REJECTED", "HOD_REJECTED", "ADMIN_REJECTED"] }
    })
      .populate("faculty", "name employeeId department role")
      .sort({ updatedAt: -1 });
    res.json(uploads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching rejected uploads" });
  }
};

/* GET PENDING UPLOADS FOR ADMIN */
exports.getPendingUploadsForAdmin = async(req,res)=>{
try{
if(req.user.role!=="ADMIN"){
return res.status(403).json({message:"Access denied"});
}
    const uploads = await Upload.find({
      status: { $in: ["FACULTY_SUBMITTED", "PENDING", "HOD_SUBMITTED", "HOD_COMMENT", "REOPENED_FOR_HOD", "NEEDS_REVISION"] }
    })
.populate("faculty","name employeeId department role")
.sort({updatedAt:-1, createdAt:-1});
res.json(uploads);
}catch(err){
console.error(err);
res.status(500).json({ message:"Error fetching uploads" });
}
};

/* ADMIN APPROVE UPLOAD */
exports.approveUploadByAdmin = async(req,res)=>{
try{
if(req.user.role!=="ADMIN"){
return res.status(403).json({message:"Access denied"});
}
const uploadDoc = await Upload.findById(req.params.id);
if(!uploadDoc){ return res.status(404).json({message:"Upload not found"}); }
uploadDoc.status="APPROVED";
uploadDoc.adminComment = "";
uploadDoc.hodComment = "";
uploadDoc.discussionComments = "";
uploadDoc.rejectionReason = "";
uploadDoc.rejectedBy = "";
uploadDoc.rejectedAt = null;
await uploadDoc.save();

    const notifFac = await Notification.create({
      message: `Your upload "${uploadDoc.title}" has been verified and awarded ${uploadDoc.credits || 0} credits by the Administrator.`,
      userId: uploadDoc.faculty,
      role: "FACULTY",
      type: "APPROVAL",
      uploadId: uploadDoc._id
    }).catch(() => {});
    if (notifFac) emitToUser(uploadDoc.faculty, "notification:new", notifFac);
    emitToUser(uploadDoc.faculty, "approvals:update", { action: "APPROVED", upload: uploadDoc });

    const notifHod = await Notification.create({
      message: `Upload "${uploadDoc.title}" (${uploadDoc.department}) has been verified and approved by Administrator.`,
      role: "HOD",
      department: uploadDoc.department,
      type: "APPROVAL",
      uploadId: uploadDoc._id
    }).catch(() => {});
    if (notifHod) emitToDepartment(uploadDoc.department, "notification:new", notifHod);
    emitToDepartment(uploadDoc.department, "approvals:update", { action: "APPROVED", upload: uploadDoc });

    broadcastEvent("sync:approvals", { action: "APPROVED", id: uploadDoc._id });
    broadcastEvent("sync:credits", { department: uploadDoc.department });

    // Email faculty about Admin approval (non-blocking)
    Promise.resolve().then(async () => {
      try {
        const fac = await Faculty.findById(uploadDoc.faculty).select('name email').lean();
        if (fac) await sendFacultyNotificationEmail(fac, uploadDoc.title, 'APPROVED', 'Administrator', null, uploadDoc.credits);
      } catch (e) { console.error('[EMAIL] Admin approval notification failed:', e.message); }
    });

    res.json({ message:"Upload approved by admin", upload: uploadDoc });

  }catch(err){
    console.error(err);
    res.status(500).json({ message:"Admin approval failed" });
  }
};

/* ADMIN REVOKE & REJECT UPLOAD */
exports.rejectUploadByAdmin = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }
    const uploadDoc = await Upload.findById(req.params.id);
    if (!uploadDoc) { return res.status(404).json({ message: "Upload not found" }); }
    
    const reason = req.body.reason || req.body.comment || "Revoked & Rejected by Administrator";
    uploadDoc.status = "REJECTED";
    uploadDoc.adminComment = reason;
    uploadDoc.rejectionReason = reason;
    uploadDoc.rejectedBy = `Administrator (${req.user.name || "Admin"})`;
    uploadDoc.rejectedAt = new Date();
    await uploadDoc.save();

    const notif = await Notification.create({
      message: `Your upload "${uploadDoc.title}" was revoked & rejected by Administrator: ${uploadDoc.adminComment}`,
      userId: uploadDoc.faculty,
      role: "FACULTY",
      type: "REJECTION",
      uploadId: uploadDoc._id
    }).catch(() => {});
    if (notif) emitToUser(uploadDoc.faculty, "notification:new", notif);
    emitToUser(uploadDoc.faculty, "approvals:update", { action: "REJECTED", upload: uploadDoc });

    const notifHod = await Notification.create({
      message: `Upload "${uploadDoc.title}" (${uploadDoc.department}) was revoked & rejected by Administrator: ${uploadDoc.adminComment}`,
      role: "HOD",
      department: uploadDoc.department,
      type: "REJECTION",
      uploadId: uploadDoc._id
    }).catch(() => {});
    if (notifHod) emitToDepartment(uploadDoc.department, "notification:new", notifHod);

    broadcastEvent("sync:approvals", { action: "REJECTED", id: uploadDoc._id });
    broadcastEvent("sync:credits", { department: uploadDoc.department });

    // Email faculty about Admin revocation (non-blocking)
    Promise.resolve().then(async () => {
      try {
        const fac = await Faculty.findById(uploadDoc.faculty).select('name email').lean();
        if (fac) await sendFacultyNotificationEmail(fac, uploadDoc.title, 'REJECTED', 'Administrator', uploadDoc.adminComment);
      } catch (e) { console.error('[EMAIL] Admin rejection notification failed:', e.message); }
    });

    res.json({ message: "Document revoked and rejected by Admin", upload: uploadDoc });

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
      status: { $in: ["APPROVED", "ADMIN_APPROVED", "HOD_APPROVED"] }
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
      status: { $in: ["REJECTED", "ADMIN_REJECTED", "HOD_REJECTED"] }
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

    const reason = (req.body.reason || req.body.comment || "").trim();

    if (req.user.role === "ADMIN") {
      // Admin re-opens review -> Routes to HOD (NOT directly to faculty)
      uploadDoc.status = "REOPENED_FOR_HOD";
      uploadDoc.adminComment = reason || "Administrator requested re-review on this document.";
      uploadDoc.rejectionReason = "";
      uploadDoc.rejectedBy = "";
      uploadDoc.rejectedAt = null;
      await uploadDoc.save();

      // Notify HOD of that department
      const notifHod = await Notification.create({
        message: `Administrator requested re-review on "${uploadDoc.title}" (${uploadDoc.department}): "${uploadDoc.adminComment}". Please review.`,
        role: "HOD",
        department: uploadDoc.department,
        type: "DISCUSSION",
        uploadId: uploadDoc._id
      }).catch(() => {});
      if (notifHod) emitToDepartment(uploadDoc.department, "notification:new", notifHod);
      emitToDepartment(uploadDoc.department, "approvals:update", { action: "REOPENED_FOR_HOD", upload: uploadDoc });

      broadcastEvent("sync:approvals", { action: "REOPENED_FOR_HOD", id: uploadDoc._id });
      broadcastEvent("sync:credits", { department: uploadDoc.department });

      return res.json({ message: "Proposal re-opened and routed to HOD for review", upload: uploadDoc });
    } else if (req.user.role === "HOD") {
      if (uploadDoc.department !== req.user.department) {
        return res.status(403).json({ message: "Access denied (Different department)" });
      }

      if (req.body.needsRevision || req.body.sendToFaculty) {
        // HOD sends to Faculty for revisions
        uploadDoc.status = "NEEDS_REVISION";
        uploadDoc.hodComment = reason || "HOD requested revisions on this document.";
        uploadDoc.rejectionReason = "";
        uploadDoc.rejectedBy = "";
        uploadDoc.rejectedAt = null;
        await uploadDoc.save();

        const notif = await Notification.create({
          message: `HOD (${req.user.name || "HOD"}) requested revisions on "${uploadDoc.title}": ${uploadDoc.hodComment}`,
          userId: uploadDoc.faculty,
          role: "FACULTY",
          type: "DISCUSSION",
          uploadId: uploadDoc._id
        }).catch(() => {});
        if (notif) emitToUser(uploadDoc.faculty, "notification:new", notif);
        emitToUser(uploadDoc.faculty, "approvals:update", { action: "NEEDS_REVISION", upload: uploadDoc });

        broadcastEvent("sync:approvals", { action: "NEEDS_REVISION", id: uploadDoc._id });

        // Email faculty about revision (non-blocking)
        Promise.resolve().then(async () => {
          try {
            const fac = await Faculty.findById(uploadDoc.faculty).select('name email').lean();
            if (fac) await sendFacultyNotificationEmail(fac, uploadDoc.title, 'REVISION', `HOD (${req.user.name || 'HOD'})`, uploadDoc.hodComment);
          } catch (e) { console.error('[EMAIL] HOD revision notification failed:', e.message); }
        });

        return res.json({ message: "Revision requested from faculty", upload: uploadDoc });
      } else {
        uploadDoc.status = "FACULTY_SUBMITTED";
        uploadDoc.rejectionReason = "";
        uploadDoc.rejectedBy = "";
        uploadDoc.rejectedAt = null;
        await uploadDoc.save();

        broadcastEvent("sync:approvals", { action: "MOVED_TO_PENDING", id: uploadDoc._id });
        return res.json({ message: "Upload moved back to pending review", upload: uploadDoc });
      }
    }
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

    const notif = await Notification.create({
      message: `${req.user.role === "HOD" ? `HOD (${req.user.name || "HOD"})` : "Administrator"} added a review comment on "${uploadDoc.title}"${req.body.needsRevision ? " (Revision Requested)" : ""}: ${req.body.comment || ""}`,
      userId: uploadDoc.faculty,
      role: "FACULTY",
      type: "DISCUSSION",
      uploadId: uploadDoc._id
    }).catch(() => {});
    if (notif) emitToUser(uploadDoc.faculty, "notification:new", notif);
    emitToUser(uploadDoc.faculty, "approvals:update", { action: "DISCUSSION", upload: uploadDoc });

    broadcastEvent("sync:approvals", { action: "DISCUSSION", id: uploadDoc._id });

    // Email faculty about discussion/revision (non-blocking)
    Promise.resolve().then(async () => {
      try {
        const fac = await Faculty.findById(uploadDoc.faculty).select('name email').lean();
        const statusKey = req.body.needsRevision ? 'REVISION' : 'DISCUSSION';
        const reviewer = req.user.role === 'HOD' ? `HOD (${req.user.name || 'HOD'})` : 'Administrator';
        if (fac) await sendFacultyNotificationEmail(fac, uploadDoc.title, statusKey, reviewer, req.body.comment);
      } catch (e) { console.error('[EMAIL] Discussion notification failed:', e.message); }
    });

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
        $in: ["APPROVED", "FACULTY_SUBMITTED", "HOD_SUBMITTED", "HOD_APPROVED", "ADMIN_APPROVED", "REOPENED_FOR_HOD"]
      }
    };
    if (req.user.role === "HOD") {
      query.department = req.user.department;
    } else if (req.user.role === "ADMIN" && req.query.department) {
      query.department = req.query.department;
    }
    const uploads = await Upload.find(query).sort({ createdAt: -1 });
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
      status: { $in: ["APPROVED", "HOD_APPROVED", "ADMIN_APPROVED"] }
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