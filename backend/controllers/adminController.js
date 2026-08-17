const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Faculty = require("../models/Faculty");
const HOD = require("../models/HOD");
const User = require("../models/User");
const Notification = require("../models/Notification");
const createUserFolder = require("../utils/createUserFolder");
const Upload = require("../models/Upload");
const Department = require("../models/Department");
const { sendApprovalEmailToFaculty, sendApprovalEmailToHod, sendOnboardingEmail } = require("../utils/emailService");


/* =========================
   GET PENDING FACULTY
========================= */
exports.getPendingFaculty = async (req, res) => {
  try {

    if (req.user.role !== "ADMIN" && req.user.role !== "HOD") {
      return res.status(403).json({ message: "Only Admin or HOD can view pending faculty" });
    }

    const faculty = await Faculty.find({ isApproved: false });

    res.status(200).json(faculty);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


/* =========================
   APPROVE FACULTY
========================= */
exports.approveFaculty = async (req, res) => {
  try {

    if (req.user.role !== "ADMIN" && req.user.role !== "HOD") {
      return res.status(403).json({ message: "Only Admin or HOD can approve faculty" });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Faculty ID" });
    }

    const faculty = await Faculty.findByIdAndUpdate(
      id,
      {
        isApproved: true,
        status: "APPROVED"
      },
      { new: true }
    );

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    if (faculty.employeeId) {
      createUserFolder("faculty", faculty.employeeId);
    }

    await Notification.create({
      message: `HOD approved Faculty ${faculty.name}`,
      role: "HOD",
    });

    // email to faculty about approval
    try {
      await sendApprovalEmailToFaculty(faculty);
    } catch (err) {
      console.error('Failed to send faculty approval email:', err);
    }

    res.status(200).json({
      message: "Faculty approved successfully",
      faculty,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   GET ALL HODS
========================= */
exports.getAllHods = async (req, res) => {
  try {

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can view HODs" });
    }

    const hods = await HOD.find();

    res.status(200).json(hods);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch HODs" });
  }
};


/* =========================
   GET PENDING HODS
========================= */
exports.getPendingHods = async (req, res) => {
  try {

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can view pending HODs" });
    }

    const hods = await HOD.find({
      isApproved: false
    });

    res.status(200).json(hods);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch pending HODs" });
  }
};


/* =========================
   APPROVE HOD
========================= */
exports.approveHod = async (req, res) => {
  try {

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can approve HOD" });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid HOD ID" });
    }

    const hod = await HOD.findByIdAndUpdate(
  id,
  {
    isApproved: true,
    status: "APPROVED",   // ⭐ THIS LINE IS MISSING
    discussionComment: ""
  },
  { new: true }
);

    if (!hod) {
      return res.status(404).json({ message: "HOD not found" });
    }

    if (hod.employeeId) {
      createUserFolder("hod", hod.employeeId);
    }

    await Notification.create({
      message: `Admin approved HOD ${hod.name}`,
      role: "ADMIN"
    });

    // email to HOD about approval
    try {
      await sendApprovalEmailToHod(hod);
    } catch (err) {
      console.error('Failed to send HOD approval email:', err);
    }

    res.status(200).json({
      message: "HOD approved successfully",
      hod,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Approval failed" });
  }
};


/* =========================
   CALL DISCUSSION FOR HOD
========================= */
/* =========================
   CALL DISCUSSION FOR HOD
========================= */
exports.hodDiscussion = async (req,res)=>{

try{

if(req.user.role !== "ADMIN"){
return res.status(403).json({message:"Only Admin can request discussion"});
}

const { id } = req.params;

if(!mongoose.Types.ObjectId.isValid(id)){
return res.status(400).json({message:"Invalid HOD ID"});
}

const hod = await HOD.findById(id);

if(!hod){
return res.status(404).json({message:"HOD not found"});
}

/* DEFAULT DISCUSSION MESSAGE */

hod.discussionComment = "Admin requested discussion";
hod.status = "DISCUSSION";     // ⭐ IMPORTANT FIX
hod.isApproved = false;

await hod.save();

res.json({
message:"Discussion requested successfully"
});

}catch(err){

console.error(err);

res.status(500).json({
message:"Discussion failed"
});

}

};

/* =========================
   REMOVE APPROVED HOD
========================= */
exports.removeApprovedHod = async (req,res)=>{

try{

if(req.user.role !== "ADMIN"){
return res.status(403).json({message:"Only Admin can remove HOD"});
}

const { id } = req.params;

if(!mongoose.Types.ObjectId.isValid(id)){
return res.status(400).json({message:"Invalid HOD ID"});
}

const hod = await HOD.findByIdAndDelete(id);

if(!hod){
return res.status(404).json({message:"HOD not found"});
}

res.json({
message:"HOD removed successfully"
});

}catch(err){

console.error(err);

res.status(500).json({
message:"Failed to remove HOD"
});

}

};


/* =========================
   GET PENDING HOD UPLOADS
========================= */
exports.getPendingUploadsForAdmin = async (req, res) => {

try {

if (req.user.role !== "ADMIN") {
return res.status(403).json({ message: "Only Admin can view uploads" });
}

const uploads = await Upload.find({
status: "HOD_SUBMITTED"
}).sort({ createdAt: -1 });

const formatted = await Promise.all(

uploads.map(async (u) => {

let faculty = null;

if (u.createdByRole === "HOD") {
faculty = await HOD.findById(u.faculty).select("name employeeId department");
}

return {
...u._doc,
faculty
};

})

);

res.status(200).json(formatted);

} catch (error) {

console.error(error);

res.status(500).json({
message: "Failed to fetch uploads"
});

}

};


/* =========================
   ADMIN APPROVE HOD UPLOAD
========================= */
exports.approveUploadByAdmin = async (req, res) => {
  try {

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can approve uploads" });
    }

    const upload = await Upload.findById(req.params.id);

    if (!upload) {
      return res.status(404).json({ message: "Upload not found" });
    }

    upload.status = "ADMIN_APPROVED";
    upload.adminComment = "";
    upload.hodComment = "";
    upload.discussionComments = [];
    upload.rejectionReason = "";

    await upload.save();

    // Synchronize totalCredits in Faculty and HOD documents
    if (upload.faculty) {
      const userApproved = await Upload.find({ faculty: upload.faculty, status: "ADMIN_APPROVED" });
      const total = userApproved.reduce((sum, u) => sum + (Number(u.credits) || 0), 0);
      await Faculty.findByIdAndUpdate(upload.faculty, { totalCredits: total });
      await HOD.findByIdAndUpdate(upload.faculty, { totalCredits: total });
    }

    res.status(200).json({
      message: "Upload approved by Admin",
      upload
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Approval failed" });
  }
};


/* =========================
   ADMIN DISCUSSION
========================= */
exports.adminDiscussion = async (req, res) => {
  try {

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can call discussion" });
    }

    const upload = await Upload.findById(req.params.id);

    if (!upload) {
      return res.status(404).json({ message: "Upload not found" });
    }

    upload.status = "ADMIN_COMMENT";
    upload.adminComment = req.body.comment || "";

    await upload.save();

    res.status(200).json({
      message: "Discussion requested",
      upload
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Discussion failed"
    });

  }
};


/* =========================
   GET DEPARTMENT STATUS
========================= */
/* =========================
   GET ALL DEPARTMENTS
========================= */
exports.getDepartmentStatus = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can view departments" });
    }

    let depts = await Department.find().sort({ name: 1 });

    if (!depts || depts.length === 0) {
      return res.status(200).json([]);
    }

    const result = await Promise.all(
      depts.map(async (dep) => {
        const activeHod = await HOD.findOne({
          department: dep.name,
          isApproved: true
        }).select("name employeeId") || await Faculty.findOne({
          department: dep.name,
          $or: [{ role: "HOD" }, { designation: /HOD/i }],
          isApproved: true
        }).select("name employeeId");

        const resolvedHod = activeHod ? activeHod.name : "Unassigned";

        // Keep Department model synced with actual HOD state
        if (dep.hod !== resolvedHod) {
          dep.hod = resolvedHod;
          await dep.save();
        }

        const facultyCount = await Faculty.countDocuments({
          department: dep.name,
          isApproved: true
        });

        // Compute total credits for this department from approved uploads
        const deptUploads = await Upload.aggregate([
          { $match: { department: dep.name, status: "ADMIN_APPROVED" } },
          { $group: { _id: null, totalCredits: { $sum: "$creditPoints" } } }
        ]);
        const credits = deptUploads[0]?.totalCredits || dep.totalCredits || 0;

        return {
          _id: dep._id,
          name: dep.name,
          code: dep.code || dep.name,
          department: dep.name,
          hod: resolvedHod,
          hodName: activeHod ? activeHod.name : null,
          facultyCount,
          credits,
          description: dep.description || "",
          createdAt: dep.createdAt
        };
      })
    );

    res.status(200).json(result);
  } catch (err) {
    console.error("GET DEPARTMENTS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch departments" });
  }
};

/* =========================
   CREATE DEPARTMENT
========================= */
exports.createDepartment = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can create departments" });
    }

    const { name, code, hod, description } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Department name is required" });
    }

    const normalizedName = name.trim().toUpperCase();
    const existing = await Department.findOne({ name: normalizedName });
    if (existing) {
      return res.status(400).json({ message: `Department ${normalizedName} already exists` });
    }

    const newDept = new Department({
      name: normalizedName,
      code: code ? code.trim().toUpperCase() : normalizedName,
      hod: hod || "Unassigned",
      description: description || ""
    });

    await newDept.save();

    res.status(201).json({
      message: "Department created successfully",
      department: newDept
    });
  } catch (err) {
    console.error("CREATE DEPARTMENT ERROR:", err);
    res.status(500).json({ message: "Failed to create department" });
  }
};

/* =========================
   UPDATE DEPARTMENT
========================= */
exports.updateDepartment = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can update departments" });
    }

    const { id } = req.params;
    const { name, code, hod, description } = req.body;

    let dept;
    if (mongoose.Types.ObjectId.isValid(id)) {
      dept = await Department.findById(id);
    }
    if (!dept) {
      dept = await Department.findOne({ name: id.toUpperCase() });
    }

    if (!dept) {
      return res.status(404).json({ message: "Department not found" });
    }

    if (name && name.trim()) {
      dept.name = name.trim().toUpperCase();
    }
    if (code !== undefined) {
      dept.code = code.trim().toUpperCase();
    }
    if (hod !== undefined) {
      dept.hod = hod;
    }
    if (description !== undefined) {
      dept.description = description;
    }

    await dept.save();

    res.status(200).json({
      message: "Department updated successfully",
      department: dept
    });
  } catch (err) {
    console.error("UPDATE DEPARTMENT ERROR:", err);
    res.status(500).json({ message: "Failed to update department" });
  }
};

/* =========================
   DELETE SINGLE DEPARTMENT
========================= */
exports.deleteDepartment = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can delete departments" });
    }

    const { id } = req.params;
    let deleted;

    if (mongoose.Types.ObjectId.isValid(id)) {
      deleted = await Department.findByIdAndDelete(id);
    }
    if (!deleted) {
      deleted = await Department.findOneAndDelete({ name: id.toUpperCase() });
    }

    if (!deleted) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.status(200).json({
      message: `Department ${deleted.name} deleted successfully`
    });
  } catch (err) {
    console.error("DELETE DEPARTMENT ERROR:", err);
    res.status(500).json({ message: "Failed to delete department" });
  }
};

/* =========================
   BULK DELETE DEPARTMENTS
========================= */
exports.bulkDeleteDepartments = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can perform bulk delete" });
    }

    const { ids, names } = req.body;
    if ((!ids || ids.length === 0) && (!names || names.length === 0)) {
      return res.status(400).json({ message: "No departments specified for deletion" });
    }

    const validIds = (ids || []).filter(id => mongoose.Types.ObjectId.isValid(id));
    const queryNames = (names || []).map(n => n.toUpperCase());

    const result = await Department.deleteMany({
      $or: [
        { _id: { $in: validIds } },
        { name: { $in: queryNames } },
        { _id: { $in: ids || [] } }
      ]
    });

    res.status(200).json({
      message: `${result.deletedCount} department(s) deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error("BULK DELETE DEPARTMENTS ERROR:", err);
    res.status(500).json({ message: "Failed to perform bulk delete" });
  }
};


/* =========================
   TOP DEPARTMENTS BY CREDITS
========================= */
exports.getTopDepartments = async (req,res)=>{

try{

if(req.user.role !== "ADMIN"){
return res.status(403).json({message:"Access denied"});
}

const result = await Upload.aggregate([

{
$match:{
status:{ $in:["HOD_APPROVED","ADMIN_APPROVED"] }
}
},

{
$group:{
_id:"$department",
totalCredits:{ $sum:"$credits" }
}
},

{
$sort:{ totalCredits:-1 }
},

{
$limit:4
}

]);

const formatted = result.map(r=>({
department:r._id,
credits:r.totalCredits
}));

res.json(formatted);

}catch(err){

console.error(err);

res.status(500).json({
message:"Failed to fetch top departments"
});

}

};


/* =========================
   MOST POPULAR ACTIVITIES
========================= */
exports.getActivityStats = async (req,res)=>{

try{

if(req.user.role !== "ADMIN"){
return res.status(403).json({message:"Access denied"});
}

const result = await Upload.aggregate([

{
$match:{
status:{ $in:["HOD_APPROVED","ADMIN_APPROVED"] }
}
},

{
$group:{
_id:"$category",
count:{ $sum:1 }
}
},

{
$sort:{ count:-1 }
},

{
$limit:5
}

]);

const formatted = result.map(r=>({
category:r._id,
count:r.count
}));

res.json(formatted);

}catch(err){

console.error(err);

res.status(500).json({
message:"Failed to fetch activity stats"
});

}

};

/* =========================
   GET ALL FACULTY + HODS
========================= */

exports.getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const [faculty, hods, approvedUploads] = await Promise.all([
      Faculty.find({ isApproved: true }).lean(),
      HOD.find({ isApproved: true }).lean(),
      Upload.find({ status: "ADMIN_APPROVED" }).lean()
    ]);

    const creditMap = {};
    approvedUploads.forEach(u => {
      const fid = u.faculty?.toString();
      if (fid) {
        creditMap[fid] = (creditMap[fid] || 0) + (Number(u.credits) || 0);
      }
    });

    const users = [
      ...faculty.map(f => ({
        ...f,
        role: "FACULTY",
        totalCredits: creditMap[f._id.toString()] ?? (f.totalCredits || 0)
      })),
      ...hods.map(h => ({
        ...h,
        role: "HOD",
        totalCredits: creditMap[h._id.toString()] ?? (h.totalCredits || 0)
      }))
    ].sort((a, b) => (b.totalCredits || 0) - (a.totalCredits || 0));

    res.json(users);
  } catch (err) {
    console.error("GET ALL USERS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

/* =========================
   DELETE FACULTY OR HOD
========================= */

exports.deleteUser = async (req,res)=>{

try{

if(req.user.role !== "ADMIN"){
return res.status(403).json({message:"Only Admin can delete users"});
}

const { id } = req.params;

if(!mongoose.Types.ObjectId.isValid(id)){
return res.status(400).json({message:"Invalid User ID"});
}

/* DELETE FACULTY */

const faculty = await Faculty.findById(id);

if(faculty){

await Upload.deleteMany({ faculty:id });

await Faculty.findByIdAndDelete(id);

return res.json({
message:"Faculty removed successfully"
});

}

/* DELETE HOD */

const hod = await HOD.findById(id);

if(hod){

await Upload.deleteMany({ faculty:id });

await HOD.findByIdAndDelete(id);

return res.json({
message:"HOD removed successfully"
});

}

res.status(404).json({
message:"User not found"
});

}catch(err){

console.error(err);

res.status(500).json({
message:"Delete failed"
});

}

};
exports.changeDepartment = async (req,res)=>{

try{

if(req.user.role !== "ADMIN"){
return res.status(403).json({message:"Only Admin can change department"});
}

const { id } = req.params;
const { department } = req.body;

/* UPDATE FACULTY */

let faculty = await Faculty.findById(id);

if(faculty){

await Faculty.findByIdAndUpdate(
id,
{ department },
{ new:true }
);

return res.json({
message:"Faculty department updated"
});

}

/* UPDATE HOD */

let hod = await HOD.findById(id);

if(hod){

await HOD.findByIdAndUpdate(
id,
{ department },
{ new:true }
);

return res.json({
message:"HOD department updated"
});

}

res.status(404).json({message:"User not found"});

}catch(err){

console.error(err);

res.status(500).json({message:"Update failed"});

}

};
/* =========================
   GET DEPARTMENT ANALYTICS
========================= */

exports.getDepartmentAnalytics = async (req,res)=>{

try{

if(req.user.role !== "ADMIN"){
return res.status(403).json({message:"Access denied"});
}

const { department } = req.params;

/* GET APPROVED ACTIVITIES */

const uploads = await Upload.find({
department,
status:{ $in:["HOD_APPROVED","ADMIN_APPROVED"] },
createdByRole:{ $in:["FACULTY","HOD"] }
});

/* TOTAL CREDITS */

const totalCredits = uploads.reduce(
(sum,u)=>sum + (u.credits || 0),
0
);

/* TOTAL ACTIVITIES */

const totalActivities = uploads.length;

/* TOTAL FACULTY */

const facultyCount = await Faculty.countDocuments({
department,
isApproved:true
});

res.json({
totalCredits,
totalActivities,
facultyCount
});

}catch(err){

console.error(err);

res.status(500).json({
message:"Failed to fetch department analytics"
});

}

};

/* =========================
   ARCHIVE ACADEMIC YEAR
========================= */
exports.archiveAcademicYear = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only ADMIN can archive the year" });
    }

    const { archiveYear } = req.body;
    if (!archiveYear) {
      return res.status(400).json({ message: "archiveYear is required" });
    }

    // Flag all current active uploads as archived
    const result = await Upload.updateMany(
      { archived: { $ne: true } }, 
      { $set: { archived: true, archivedYear: archiveYear } }
    );

    res.json({ 
      message: `Successfully archived academic year ${archiveYear}`, 
      documentsArchived: result.modifiedCount 
    });
  } catch (error) {
    console.error("Archive Year Error:", error);
    res.status(500).json({ message: "Failed to archive academic year" });
  }
};

/* =====================================================
   ADMIN FACULTY CRUD OPERATIONS
===================================================== */

/* GET ALL FACULTY, HODS, AND ADMINS */
exports.getAllFaculty = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can view staff list" });
    }

    const [facultyList, hodList, adminList, approvedUploads] = await Promise.all([
      Faculty.find().sort({ createdAt: -1 }),
      HOD.find().sort({ createdAt: -1 }),
      User.find({ role: "ADMIN" }).sort({ createdAt: -1 }),
      Upload.find({ status: "ADMIN_APPROVED" }).lean()
    ]);

    const creditMap = {};
    approvedUploads.forEach(u => {
      const fid = u.faculty?.toString();
      if (fid) {
        creditMap[fid] = (creditMap[fid] || 0) + (Number(u.credits) || 0);
      }
    });

    const combined = [
      ...adminList.map(a => {
        const obj = a.toObject();
        return {
          ...obj,
          employeeId: obj.employeeId || obj.regId,
          name: obj.name || "Administrator",
          department: obj.department || "ADMINISTRATION",
          designation: obj.designation || "Institutional Administrator",
          role: "ADMIN",
          totalCredits: creditMap[obj._id.toString()] ?? 0
        };
      }),
      ...facultyList.map(f => {
        const obj = f.toObject();
        return {
          ...obj,
          role: obj.role || "FACULTY",
          totalCredits: creditMap[obj._id.toString()] ?? (obj.totalCredits || 0)
        };
      }),
      ...hodList.map(h => {
        const obj = h.toObject();
        return {
          ...obj,
          role: "HOD",
          totalCredits: creditMap[obj._id.toString()] ?? (obj.totalCredits || 0)
        };
      })
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json(combined);
  } catch (err) {
    console.error("GET ALL FACULTY ERROR:", err);
    res.status(500).json({ message: "Failed to fetch staff list" });
  }
};

/* CREATE FACULTY, HOD, OR ADMIN */
exports.createFaculty = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can add staff or administrators" });
    }

    const {
      name,
      email,
      employeeId,
      department,
      designation,
      role,
      password,
      googleScholar,
      vidwanId,
      scopusId
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and Email are required" });
    }

    const assignedRole = (role || "FACULTY").toUpperCase();
    const resolvedEmployeeId = (employeeId || (assignedRole === "ADMIN" ? `ADM-${Date.now().toString().slice(-4)}` : "")).trim();

    if (!resolvedEmployeeId && assignedRole !== "ADMIN") {
      return res.status(400).json({ message: "Employee ID is required" });
    }

    const normalizedDept = (department || (assignedRole === "ADMIN" ? "ADMINISTRATION" : "")).trim().toUpperCase();

    // Check across User (Admin), Faculty, and HOD collections
    const existing = await User.findOne({
      $or: [{ regId: resolvedEmployeeId }, { email: email.trim().toLowerCase() }]
    }) || await Faculty.findOne({
      $or: [{ employeeId: resolvedEmployeeId }, { email: email.trim().toLowerCase() }]
    }) || await HOD.findOne({
      $or: [{ employeeId: resolvedEmployeeId }, { email: email.trim().toLowerCase() }]
    });

    if (existing) {
      return res.status(400).json({ message: "A user with this ID or Email already exists." });
    }

    let hashedPassword = null;
    if (password && password.trim().length >= 6) {
      hashedPassword = await bcrypt.hash(password.trim(), 10);
    }

    if (assignedRole === "ADMIN") {
      // Create as Institutional Administrator
      const newAdmin = new User({
        name: name.trim(),
        regId: resolvedEmployeeId,
        employeeId: resolvedEmployeeId,
        email: email.trim().toLowerCase(),
        department: normalizedDept || "ADMINISTRATION",
        designation: designation ? designation.trim() : "Institutional Administrator",
        password: hashedPassword,
        role: "ADMIN",
        isApproved: true,
        isFirstLogin: !hashedPassword
      });

      await newAdmin.save();

      // Send onboarding email (non-blocking)
      Promise.resolve().then(async () => {
        try { await sendOnboardingEmail(newAdmin, 'Institutional Administrator'); } catch (e) { console.error('[EMAIL] Admin onboarding failed:', e.message); }
      });

      return res.status(201).json({
        message: `Administrator account for ${name} created successfully with full Admin privileges`,
        faculty: newAdmin,
        admin: newAdmin
      });
    } else if (assignedRole === "HOD" || (designation && designation.toUpperCase().includes("HOD"))) {
      // Create as HOD
      const newHod = new HOD({
        employeeId: resolvedEmployeeId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        department: normalizedDept,
        designation: designation ? designation.trim() : "Head of Department (HOD)",
        googleScholar: googleScholar ? googleScholar.trim() : "",
        vidwanId: vidwanId ? vidwanId.trim() : "",
        scopusId: scopusId ? scopusId.trim() : "",
        role: "HOD",
        isApproved: true,
        status: "APPROVED",
        isFirstLogin: !hashedPassword,
        totalCredits: 0
      });

      await newHod.save();

      // Automatically update/assign this HOD to the Department in Department collection
      await Department.findOneAndUpdate(
        { name: normalizedDept },
        { hod: name.trim() }
      );

      // Send onboarding email (non-blocking)
      Promise.resolve().then(async () => {
        try { await sendOnboardingEmail(newHod, 'Institutional Administrator'); } catch (e) { console.error('[EMAIL] HOD onboarding failed:', e.message); }
      });

      return res.status(201).json({
        message: `HOD ${name} created and assigned to ${normalizedDept} successfully`,
        faculty: newHod
      });
    } else {
      // Create as Faculty
      const newFaculty = new Faculty({
        employeeId: resolvedEmployeeId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        department: normalizedDept,
        designation: designation ? designation.trim() : "Assistant Professor",
        googleScholar: googleScholar ? googleScholar.trim() : "",
        vidwanId: vidwanId ? vidwanId.trim() : "",
        scopusId: scopusId ? scopusId.trim() : "",
        role: "FACULTY",
        isApproved: true,
        status: "APPROVED",
        isFirstLogin: !hashedPassword,
        totalCredits: 0
      });

      await newFaculty.save();

      // Send onboarding email (non-blocking)
      Promise.resolve().then(async () => {
        try { await sendOnboardingEmail(newFaculty, 'Institutional Administrator'); } catch (e) { console.error('[EMAIL] Faculty onboarding failed:', e.message); }
      });

      return res.status(201).json({
        message: "Faculty member added successfully",
        faculty: newFaculty
      });
    }
  } catch (err) {
    console.error("CREATE FACULTY/ADMIN ERROR:", err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'Employee ID / Email';
      return res.status(400).json({ message: `A member with this ${field} already exists.` });
    }
    res.status(500).json({ message: err.message || "Failed to add member" });
  }
};

/* CREATE ADMIN EXPLICIT ENDPOINT */
exports.createAdmin = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can create another Admin" });
    }
    req.body.role = "ADMIN";
    return exports.createFaculty(req, res);
  } catch (err) {
    console.error("CREATE ADMIN ERROR:", err);
    res.status(500).json({ message: "Failed to create administrator account" });
  }
};

/* UPDATE FACULTY, HOD, OR ADMIN */
exports.updateFaculty = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can update staff details" });
    }

    const { id } = req.params;
    const {
      name,
      email,
      employeeId,
      department,
      designation,
      password,
      status,
      googleScholar,
      vidwanId,
      scopusId
    } = req.body;

    let member = await Faculty.findById(id);
    let isHod = false;
    let isAdmin = false;

    if (!member) {
      member = await HOD.findById(id);
      if (member) isHod = true;
    }
    if (!member) {
      member = await User.findById(id);
      if (member) isAdmin = true;
    }

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    if (name) member.name = name.trim();
    if (email) member.email = email.trim().toLowerCase();
    if (employeeId) {
      member.employeeId = employeeId.trim();
      if (isAdmin) member.regId = employeeId.trim();
    }
    if (department) {
      member.department = department.trim().toUpperCase();
      if (isHod) {
        await Department.findOneAndUpdate(
          { name: member.department },
          { hod: member.name }
        );
      }
    }
    if (designation) member.designation = designation.trim();
    if (status) {
      member.status = status;
      member.isApproved = status === "APPROVED";
    }
    if (googleScholar !== undefined) member.googleScholar = googleScholar.trim();
    if (vidwanId !== undefined) member.vidwanId = vidwanId.trim();
    if (scopusId !== undefined) member.scopusId = scopusId.trim();

    if (password && password.trim().length >= 6) {
      member.password = await bcrypt.hash(password.trim(), 10);
    }

    await member.save();

    res.status(200).json({
      message: `${isAdmin ? "Administrator" : isHod ? "HOD" : "Faculty"} member updated successfully`,
      faculty: member
    });
  } catch (err) {
    console.error("UPDATE FACULTY ERROR:", err);
    res.status(500).json({ message: "Failed to update member" });
  }
};

/* DELETE FACULTY, HOD, OR ADMIN */
exports.deleteFaculty = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can delete staff" });
    }

    const { id } = req.params;

    if (req.user.id === id) {
      return res.status(400).json({ message: "You cannot delete your own active Administrator account" });
    }

    let member = await Faculty.findByIdAndDelete(id);
    let wasHod = false;
    let wasAdmin = false;

    if (!member) {
      member = await HOD.findByIdAndDelete(id);
      if (member) wasHod = true;
    } else if (member.role === "HOD" || (member.designation && member.designation.toUpperCase().includes("HOD"))) {
      wasHod = true;
    }

    if (!member) {
      member = await User.findByIdAndDelete(id);
      if (member) wasAdmin = true;
    }

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    // Reset department HOD if deleted member was HOD
    if (wasHod || member.department) {
      const remainingHod = await HOD.findOne({ department: member.department, isApproved: true })
        || await Faculty.findOne({ department: member.department, role: "HOD", isApproved: true });
      
      const newHodName = remainingHod ? remainingHod.name : "Unassigned";
      await Department.findOneAndUpdate(
        { name: member.department },
        { hod: newHodName }
      );
      await Department.updateMany(
        { hod: member.name },
        { hod: newHodName }
      );
    }

    // Delete associated research uploads
    await Upload.deleteMany({ faculty: id });

    res.status(200).json({
      message: `${wasAdmin ? "Administrator" : "Member"} ${member.name} deleted successfully`
    });
  } catch (err) {
    console.error("DELETE FACULTY ERROR:", err);
    res.status(500).json({ message: "Failed to delete member" });
  }
};

/* BULK DELETE FACULTY, HODS, OR ADMINS */
exports.bulkDeleteFaculty = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can perform bulk delete" });
    }

    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Please provide an array of IDs to delete." });
    }

    // Filter out current user id to prevent self deletion
    const safeIds = ids.filter(id => id !== req.user.id);

    const [fRes, hRes, uRes] = await Promise.all([
      Faculty.deleteMany({ _id: { $in: safeIds } }),
      HOD.deleteMany({ _id: { $in: safeIds } }),
      User.deleteMany({ _id: { $in: safeIds }, role: "ADMIN" })
    ]);

    await Upload.deleteMany({ faculty: { $in: safeIds } });

    const total = fRes.deletedCount + hRes.deletedCount + uRes.deletedCount;
    res.status(200).json({
      message: `Successfully deleted ${total} member${total > 1 ? 's' : ''}.`,
      deletedCount: total
    });
  } catch (err) {
    console.error("BULK DELETE ERROR:", err);
    res.status(500).json({ message: "Failed to perform bulk delete" });
  }
};