/**
 * authMiddleware.js — Hybrid Authentication Guard
 * ─────────────────────────────────────────────────────────────────────────────
 * Accepts authentication via EITHER:
 *
 *   1. SESSION COOKIE  (browser clients — httpOnly, secure)
 *      req.session.user is populated by login → used directly.
 *
 *   2. JWT BEARER TOKEN  (API / mobile / external clients)
 *      Authorization: Bearer <token> header → verified with JWT_SECRET.
 *
 * Both paths look up the live user document from MongoDB to ensure
 * the account still exists and hasn't been deactivated since the token
 * or session was issued.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const jwt     = require("jsonwebtoken");
const HOD     = require("../models/HOD");
const Faculty = require("../models/Faculty");
const User    = require("../models/User");

const authMiddleware = async (req, res, next) => {

  // ── STRATEGY 1: Session Cookie ────────────────────────────────────────────
  if (req.session?.user) {
    const { id, role } = req.session.user;

    let user;
    if (role === "FACULTY")      user = await Faculty.findById(id);
    else if (role === "HOD")     user = await HOD.findById(id);
    else if (role === "ADMIN")   user = await User.findById(id);

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Session user not found. Please log in again." });
    }

    req.user = {
      id:         user._id.toString(),
      employeeId: (user.employeeId || user.regId || user._id.toString()).replace(/[^a-zA-Z0-9_-]/g, "_"),
      role:       user.role,
      department: user.department || null,
      name:       user.name || user.regId,
      authMethod: "session",
    };

    return next();
  }

  // ── STRATEGY 2: JWT Bearer Token ─────────────────────────────────────────
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      let user;
      if (decoded.role === "FACULTY")    user = await Faculty.findById(decoded.id);
      else if (decoded.role === "HOD")   user = await HOD.findById(decoded.id);
      else if (decoded.role === "ADMIN") user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({ message: "User not found." });
      }

      req.user = {
        id:         user._id.toString(),
        employeeId: (user.employeeId || user.regId || user._id.toString()).replace(/[^a-zA-Z0-9_-]/g, "_"),
        role:       user.role,
        department: user.department || null,
        name:       user.name || user.regId,
        authMethod: "jwt",
      };

      return next();

    } catch (err) {
      // Expired or tampered token — do not fall through silently
      return res.status(401).json({
        message: err.name === "TokenExpiredError"
          ? "Session expired. Please log in again."
          : "Invalid token.",
      });
    }
  }

  // ── No credentials at all ─────────────────────────────────────────────────
  return res.status(401).json({ message: "Authentication required." });
};

module.exports = authMiddleware;