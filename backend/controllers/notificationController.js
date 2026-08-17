const Notification = require("../models/Notification");

exports.getNotifications = async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;

    // Fetch the 40 most recent notifications relevant to this role
    const rawNotifications = await Notification.find({
      role: { $regex: new RegExp(`^${role}$`, 'i') }
    })
      .sort({ createdAt: -1 })
      .limit(40)
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
    const role = req.user.role;
    const userId = req.user.id;

    await Notification.updateMany(
      {
        role: { $regex: new RegExp(`^${role}$`, 'i') },
        readBy: { $ne: userId }
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

