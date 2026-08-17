const AcademicYear = require("../models/AcademicYear");
const Upload = require("../models/Upload");

const DEFAULT_YEARS = [
  { year: "2026-27", label: "AY 2026-27", isCurrent: false, isArchived: false, description: "Upcoming Academic Year" },
  { year: "2025-26", label: "AY 2025-26", isCurrent: true, isArchived: false, description: "Current Active College Academic Year" },
  { year: "2024-25", label: "AY 2024-25", isCurrent: false, isArchived: true, description: "Archived Academic Year (Historical Records)" },
];

/**
 * Ensures initial default academic years exist.
 */
async function ensureDefaultYears() {
  const count = await AcademicYear.countDocuments();
  if (count === 0) {
    for (const dy of DEFAULT_YEARS) {
      await AcademicYear.create(dy);
    }
  }
}

/**
 * GET /api/academic-years
 * Public / authenticated for all users (Faculty, HOD, Admin) to populate year filters.
 */
exports.getAllAcademicYears = async (req, res) => {
  try {
    await ensureDefaultYears();
    const years = await AcademicYear.find().sort({ year: -1 }).lean();
    res.json(years);
  } catch (err) {
    console.error("[AcademicYear] Fetch error:", err);
    res.status(500).json({ message: "Failed to fetch academic years." });
  }
};

/**
 * GET /api/academic-years/current
 * Returns the currently active academic year.
 */
exports.getCurrentAcademicYear = async (req, res) => {
  try {
    await ensureDefaultYears();
    let current = await AcademicYear.findOne({ isCurrent: true }).lean();
    if (!current) {
      current = await AcademicYear.findOne().sort({ year: -1 }).lean();
    }
    res.json(current);
  } catch (err) {
    console.error("[AcademicYear] Get current error:", err);
    res.status(500).json({ message: "Failed to fetch current academic year." });
  }
};

/**
 * POST /api/academic-years
 * Admin creates a new academic year (e.g. "2026-27").
 */
exports.createAcademicYear = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can create academic years." });
    }

    const { year, label, isCurrent, isArchived, description } = req.body;
    if (!year || !year.trim()) {
      return res.status(400).json({ message: "Academic year identifier is required (e.g. '2026-27')." });
    }

    const formattedYear = year.trim();
    const existing = await AcademicYear.findOne({ year: formattedYear });
    if (existing) {
      return res.status(400).json({ message: `Academic Year ${formattedYear} already exists.` });
    }

    // If marked as current, unset previous current year
    if (isCurrent) {
      await AcademicYear.updateMany({}, { isCurrent: false, isArchived: true });
    }

    const newYear = await AcademicYear.create({
      year: formattedYear,
      label: label?.trim() || `AY ${formattedYear}`,
      isCurrent: !!isCurrent,
      isArchived: isCurrent ? false : !!isArchived,
      description: description?.trim() || "",
    });

    res.status(201).json({
      message: `Academic Year ${newYear.year} created successfully.`,
      academicYear: newYear,
    });
  } catch (err) {
    console.error("[AcademicYear] Create error:", err);
    res.status(500).json({ message: "Failed to create academic year." });
  }
};

/**
 * PUT /api/academic-years/:id/set-current
 * Admin activates an academic year college-wide.
 * Automatically archives previous active years.
 */
exports.setCurrentAcademicYear = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can update college-wide academic year." });
    }

    const { id } = req.params;
    const targetYear = await AcademicYear.findById(id);
    if (!targetYear) {
      return res.status(404).json({ message: "Academic Year not found." });
    }

    // Unset all existing current years and archive them
    await AcademicYear.updateMany({}, {
      isCurrent: false,
      isArchived: true,
      description: "Archived Academic Cycle (Historical Records)"
    });

    // Set target year as current & active
    targetYear.isCurrent = true;
    targetYear.isArchived = false;
    targetYear.description = "Current Active College Academic Year (Open for Submissions)";
    await targetYear.save();

    res.json({
      message: `College-wide active academic year set to ${targetYear.year}. Previous years archived for historical viewing.`,
      academicYear: targetYear,
    });
  } catch (err) {
    console.error("[AcademicYear] Set current error:", err);
    res.status(500).json({ message: "Failed to set active academic year." });
  }
};

/**
 * PUT /api/academic-years/:id
 * Admin updates details of an academic year.
 */
exports.updateAcademicYear = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can edit academic years." });
    }

    const { id } = req.params;
    const { label, isArchived, description } = req.body;

    const targetYear = await AcademicYear.findById(id);
    if (!targetYear) {
      return res.status(404).json({ message: "Academic Year not found." });
    }

    if (label !== undefined) targetYear.label = label.trim();
    if (description !== undefined) targetYear.description = description.trim();
    if (isArchived !== undefined && !targetYear.isCurrent) {
      targetYear.isArchived = !!isArchived;
    }

    await targetYear.save();

    res.json({
      message: `Academic Year ${targetYear.year} updated successfully.`,
      academicYear: targetYear,
    });
  } catch (err) {
    console.error("[AcademicYear] Update error:", err);
    res.status(500).json({ message: "Failed to update academic year." });
  }
};

/**
 * DELETE /api/academic-years/:id
 * Admin deletes an academic year (cannot delete the active current year).
 */
exports.deleteAcademicYear = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can delete academic years." });
    }

    const { id } = req.params;
    const targetYear = await AcademicYear.findById(id);
    if (!targetYear) {
      return res.json({ message: "Academic Year already deleted or removed." });
    }

    if (targetYear.isCurrent) {
      return res.status(400).json({ message: "Cannot delete the active current academic year. Switch active year first." });
    }

    await AcademicYear.findByIdAndDelete(id);

    res.json({ message: `Academic Year ${targetYear.year} deleted successfully.` });
  } catch (err) {
    console.error("[AcademicYear] Delete error:", err);
    res.status(500).json({ message: "Failed to delete academic year." });
  }
};
