const DepartmentActivity = require("../models/DepartmentActivity");
const HOD = require("../models/HOD");
const Faculty = require("../models/Faculty");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { sendActivityEmailToHODs, sendActivityEmailToFaculty } = require("../utils/emailService");
const { emitToRole, emitToDepartment, broadcastEvent } = require("../utils/socket");

/* =====================================================
   GET ACTIVITIES (ROLE & AUDIENCE FILTERED)
   - ADMIN: Sees all activities.
   - HOD: Sees Admin activities (meant for all HODs) + activities of their own department.
   - FACULTY: Sees ONLY activities planned by their HOD for their department.
===================================================== */
exports.getActivities = async (req, res) => {
  try {
    const { role, id } = req.user;
    let query = {};
    let userDept = "ALL";

    if (role === "ADMIN") {
      const deptFilter = req.query.department;
      if (deptFilter && deptFilter !== "ALL") {
        query.department = deptFilter.toUpperCase();
      }
    } else if (role === "HOD") {
      const hod = await HOD.findById(id);
      userDept = (hod && hod.department ? hod.department : "CSE").toUpperCase();

      // HOD sees Admin events for HODs + events of their own department
      query = {
        $or: [
          { createdByRole: "ADMIN" },
          { targetAudience: "ALL_HODS" },
          { department: "ALL" },
          { department: userDept, createdByRole: "HOD" }
        ]
      };
    } else if (role === "FACULTY") {
      const faculty = await Faculty.findById(id);
      userDept = (faculty && faculty.department ? faculty.department : "CSE").toUpperCase();

      // Faculty ONLY sees activities planned by their HOD for their department
      query = {
        department: userDept,
        createdByRole: "HOD",
        targetAudience: "DEPARTMENT_FACULTY"
      };
    }

    const activities = await DepartmentActivity.find(query)
      .sort({ date: 1, time: 1 })
      .lean();

    res.status(200).json({
      activities,
      userRole: role,
      department: userDept
    });
  } catch (error) {
    console.error("GET ACTIVITIES ERROR:", error);
    res.status(500).json({ message: "Failed to fetch activities" });
  }
};

/* =====================================================
   CREATE ACTIVITY
   - ADMIN -> targetAudience: "ALL_HODS" (visible to all HODs)
   - HOD -> targetAudience: "DEPARTMENT_FACULTY" (visible to that dept faculty)
===================================================== */
exports.createActivity = async (req, res) => {
  try {
    const { role, id } = req.user;
    if (role !== "HOD" && role !== "ADMIN") {
      return res.status(403).json({ message: "Only Department HOD or Administrator can plan activities" });
    }

    const {
      title,
      description,
      date,
      time,
      venue,
      link,
      type,
      customTypeName
    } = req.body;

    if (!title || !date) {
      return res.status(400).json({ message: "Activity Title and Date are required" });
    }

    let targetDept = "ALL";
    let targetAudience = "DEPARTMENT_FACULTY";
    let creatorName = "Head of Department";

    if (role === "ADMIN") {
      const admin = await User.findById(id);
      creatorName = admin?.name || "Institutional Administrator";
      targetAudience = "ALL_HODS"; // Visible to all Dept HODs
      targetDept = req.body.department ? req.body.department.trim().toUpperCase() : "ALL";
    } else if (role === "HOD") {
      const hod = await HOD.findById(id);
      creatorName = hod?.name || "Head of Department";
      targetAudience = "DEPARTMENT_FACULTY"; // Visible to that dept's faculty
      targetDept = (hod?.department || req.body.department || "CSE").trim().toUpperCase();
    }

    let formattedLink = link ? link.trim() : "";
    if (formattedLink && !formattedLink.startsWith("http://") && !formattedLink.startsWith("https://")) {
      formattedLink = `https://${formattedLink}`;
    }

    const newActivity = new DepartmentActivity({
      title: title.trim(),
      description: description ? description.trim() : "",
      department: targetDept,
      targetAudience,
      date: new Date(date),
      time: time ? time.trim() : "10:00 AM",
      venue: venue ? venue.trim() : (role === "ADMIN" ? "Council Hall" : "Department Conference Room"),
      link: formattedLink,
      type: type || "MEETING",
      customTypeName: customTypeName ? customTypeName.trim() : "",
      status: "UPCOMING",
      createdBy: id,
      creatorModel: role === "ADMIN" ? "User" : "HOD",
      createdByName: creatorName,
      createdByRole: role
    });

    await newActivity.save();

    const actDate = new Date(date);
    const formattedDate = actDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // ── Fire in-app & email notifications (non-blocking) ──
    const savedActivity = newActivity.toObject();
    if (role === "ADMIN") {
      // Admin created → notify ALL approved HODs

      // 1. In-app notification for all HODs
      Notification.create({
        message: `Institutional Activity: "${title}" scheduled on ${formattedDate} (${time || '10:00 AM'}) at ${venue || 'Council Hall'}. Scheduled by ${creatorName}.`,
        role: "HOD",
        type: "GENERAL"
      }).then(notif => {
        if (notif) emitToRole("HOD", "notification:new", notif);
      }).catch(err => console.error("[NOTIF] Failed to create HOD in-app notification:", err.message));

      broadcastEvent("sync:activities", { action: "ACTIVITY_CREATED", id: newActivity._id });

      // 2. Email notification to all HODs
      Promise.resolve().then(async () => {
        try {
          const hods = await HOD.find({ isApproved: true, status: "APPROVED" }).select("name email department").lean();
          if (hods.length) {
            await sendActivityEmailToHODs(savedActivity, hods);
            console.log(`[EMAIL] Institutional activity "${title}" → ${hods.length} HOD(s) notified`);
          }
        } catch (emailErr) {
          console.error("[EMAIL] Failed to notify HODs about institutional activity:", emailErr.message);
        }
      });
    } else if (role === "HOD") {
      // HOD created → notify ALL approved Faculty in that department

      // 1. In-app notification for department Faculty
      Notification.create({
        message: `Department Activity: "${title}" scheduled on ${formattedDate} (${time || '10:00 AM'}) at ${venue || 'Department Conference Room'}. Scheduled by HOD (${creatorName}).`,
        role: "FACULTY",
        department: targetDept,
        type: "GENERAL"
      }).then(notif => {
        if (notif) emitToDepartment(targetDept, "notification:new", notif);
      }).catch(err => console.error("[NOTIF] Failed to create Faculty in-app notification:", err.message));

      broadcastEvent("sync:activities", { action: "ACTIVITY_CREATED", id: newActivity._id });

      // 2. Email notification to department Faculty
      Promise.resolve().then(async () => {
        try {
          const facultyList = await Faculty.find({
            department: { $regex: new RegExp(`^${targetDept}$`, "i") },
            isApproved: true,
            status: "APPROVED"
          }).select("name email").lean();
          if (facultyList.length) {
            await sendActivityEmailToFaculty(savedActivity, facultyList, targetDept);
            console.log(`[EMAIL] Dept activity "${title}" (${targetDept}) → ${facultyList.length} faculty notified`);
          }
        } catch (emailErr) {
          console.error("[EMAIL] Failed to notify faculty about dept activity:", emailErr.message);
        }
      });
    }

    const audienceLabel = role === "ADMIN" ? "All Department HODs" : `Department of ${targetDept} Faculty`;

    res.status(201).json({
      message: `Activity "${title}" planned for ${audienceLabel} successfully`,
      activity: newActivity
    });
  } catch (error) {
    console.error("CREATE ACTIVITY ERROR:", error);
    res.status(500).json({ message: "Failed to create activity" });
  }
};

/* =====================================================
   UPDATE ACTIVITY (HOD & ADMIN)
===================================================== */
exports.updateActivity = async (req, res) => {
  try {
    const { role, id } = req.user;
    if (role !== "HOD" && role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const activity = await DepartmentActivity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    // Ensure HOD can only edit activities they or their department created
    if (role === "HOD" && activity.createdByRole === "ADMIN") {
      return res.status(403).json({ message: "Only Admin can edit institutional activities" });
    }

    const {
      title,
      description,
      date,
      time,
      venue,
      link,
      type,
      customTypeName,
      status
    } = req.body;

    if (title) activity.title = title.trim();
    if (description !== undefined) activity.description = description.trim();
    if (date) activity.date = new Date(date);
    if (time) activity.time = time.trim();
    if (venue !== undefined) activity.venue = venue.trim();
    if (link !== undefined) {
      let formattedLink = link ? link.trim() : "";
      if (formattedLink && !formattedLink.startsWith("http://") && !formattedLink.startsWith("https://")) {
        formattedLink = `https://${formattedLink}`;
      }
      activity.link = formattedLink;
    }
    if (type) activity.type = type;
    if (customTypeName !== undefined) activity.customTypeName = customTypeName.trim();
    if (status) activity.status = status;

    await activity.save();

    res.status(200).json({
      message: "Activity updated successfully",
      activity
    });
  } catch (error) {
    console.error("UPDATE ACTIVITY ERROR:", error);
    res.status(500).json({ message: "Failed to update activity" });
  }
};

/* =====================================================
   DELETE ACTIVITY (HOD & ADMIN)
===================================================== */
exports.deleteActivity = async (req, res) => {
  try {
    const { role, id } = req.user;
    if (role !== "HOD" && role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const activity = await DepartmentActivity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    if (role === "HOD" && activity.createdByRole === "ADMIN") {
      return res.status(403).json({ message: "Only Admin can delete institutional activities" });
    }

    await DepartmentActivity.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: `Activity "${activity.title}" deleted successfully`
    });
  } catch (error) {
    console.error("DELETE ACTIVITY ERROR:", error);
    res.status(500).json({ message: "Failed to delete activity" });
  }
};
