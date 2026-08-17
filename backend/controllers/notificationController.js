const Notification = require("../models/Notification");
const mongoose = require("mongoose");

/**
 * Builds a targeted query ensuring:
 * 1. Targeted personal notifications (e.g. Neil's rejection/approval) only go to that user
 * 2. Department-specific HOD notifications (e.g. CSE faculty submission) only go to CSE HOD
 * 3. Administrative notices go to Admin
 * 4. Faculty NEVER receive another user's proposal decisions
 */
function buildNotificationQuery(user) {
  const userId = user.id || user._id;
  const role = (user.role || '').toUpperCase();
  const department = (user.department || '').trim();

  const conditions = [];

  // 1. Notifications targeted directly to this specific user (e.g. Neil's rejection/approval)
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    conditions.push({ userId: new mongoose.Types.ObjectId(userId.toString()) });
  }

  // 2. Role-specific notices
  if (role === "ADMIN") {
    // Admins see all admin-directed submission/approval alerts
    conditions.push({
      role: { $regex: /^admin$/i },
      $or: [{ userId: null }, { userId: { $exists: false } }]
    });
  } else if (role === "HOD") {
    // HODs only see submission & verification notices for THEIR department
    const deptRegex = department ? new RegExp(`^${department}$`, 'i') : null;
    conditions.push({
      role: { $regex: /^hod$/i },
      $or: [{ userId: null }, { userId: { $exists: false } }],
      type: { $in: ["SUBMISSION", "APPROVAL", "GENERAL", "SYSTEM"] },
      ...(deptRegex ? {
        $or: [
          { department: null },
          { department: "" },
          { department: { $exists: false } },
          { department: { $regex: deptRegex } }
        ]
      } : {})
    });
  } else if (role === "FACULTY") {
    // Faculty ONLY see general institutional broadcasts when userId is null.
    // All approval/rejection/upload-specific notices MUST have their exact userId!
    const deptRegex = department ? new RegExp(`^${department}$`, 'i') : null;
    conditions.push({
      role: { $regex: /^faculty$/i },
      $or: [{ userId: null }, { userId: { $exists: false } }],
      type: { $in: ["GENERAL", "SYSTEM"] },
      message: { $not: /Your upload/i },
      ...(deptRegex ? {
        $or: [
          { department: null },
          { department: "" },
          { department: { $exists: false } },
          { department: { $regex: deptRegex } }
        ]
      } : {})
    });
  }

  return conditions.length > 0 ? { $or: conditions } : { _id: null };
}

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = buildNotificationQuery(req.user);

    // Fetch up to 100 notifications matching targeted criteria
    const rawNotifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const notifications = rawNotifications.map(n => {
      const isRead = Array.isArray(n.readBy) && n.readBy.some(id => id.toString() === userId.toString());
      return {
        ...n,
        isRead,
        read: isRead,
      };
    });

    res.json(notifications);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const userId = req.user.id;
    if (!notification.readBy.some(id => id.toString() === userId.toString())) {
      notification.readBy.push(userId);
      await notification.save();
    }

    res.json({ message: "Marked as read" });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ message: "Failed to update notification" });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = buildNotificationQuery(req.user);

    await Notification.updateMany(
      {
        $and: [
          query,
          { readBy: { $ne: userId } }
        ]
      },
      {
        $addToSet: { readBy: userId }
      }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
    res.status(500).json({ message: "Failed to update notifications" });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: "Notification deleted" });
  } catch (err) {
    console.error("Error deleting notification:", err);
    res.status(500).json({ message: "Failed to delete notification" });
  }
};

exports.clearReadNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = buildNotificationQuery(req.user);

    await Notification.deleteMany({
      $and: [
        query,
        { readBy: userId }
      ]
    });

    res.json({ message: "Read notifications cleared" });
  } catch (err) {
    console.error("Error clearing notifications:", err);
    res.status(500).json({ message: "Failed to clear notifications" });
  }
};
