const Permission = require("../models/Permission");

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "Unauthorized - No user data" });
    }
    const userRole = req.user.role.toUpperCase();
    if (!roles.includes(userRole)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

exports.checkPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(401).json({ message: "Unauthorized - No user data" });
      }
      const userRole = req.user.role.toUpperCase();
      
      // ADMIN bypasses all specific permission checks unless explicitly blocked
      if (userRole === "ADMIN") {
        return next();
      }

      const permission = await Permission.findOne({ role: userRole, resource, action });
      if (permission && !permission.allowed) {
        return res.status(403).json({ message: "Access denied by permission policy" });
      }

      next();
    } catch (err) {
      console.error("Permission check error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};