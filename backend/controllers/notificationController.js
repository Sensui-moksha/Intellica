const Notification = require("../models/Notification");

exports.getNotifications = async (req, res) => {
  try {
    const role = req.user.role;
    // Get notifications for this user's role that they haven't read yet
    const notifications = await Notification.find({
      role: { $regex: new RegExp(`^${role}$`, 'i') },
      readBy: { $ne: req.user.id }
    }).sort({ createdAt: -1 });

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

    if (!notification.readBy.includes(req.user.id)) {
      notification.readBy.push(req.user.id);
      await notification.save();
    }

    res.json({ message: "Marked as read" });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ message: "Failed to update notification" });
  }
};
