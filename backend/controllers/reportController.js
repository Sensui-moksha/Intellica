const ExcelJS = require("exceljs");
const Upload = require("../models/Upload");
const Faculty = require("../models/Faculty");
const HOD = require("../models/HOD");
const User = require("../models/User");
const Department = require("../models/Department");

/* =====================================================
   GET DEPARTMENT ANALYTICS & FACULTY BREAKDOWN
   - Admin: sees all departments
   - HOD: sees only their department
===================================================== */
exports.getDepartmentAnalytics = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userDept = req.user.department;

    // 1. Determine departments list
    let deptQuery = {};
    if (userRole === "HOD" && userDept) {
      deptQuery = { name: new RegExp(`^${userDept}$`, "i") };
    }

    let allDepts = await Department.find(deptQuery).lean();
    if (!allDepts.length && userDept) {
      allDepts = [{ name: userDept.toUpperCase() }];
    } else if (!allDepts.length && userRole === "ADMIN") {
      allDepts = [
        { name: "CSE" },
        { name: "ECE" },
        { name: "MECH" },
        { name: "CIVIL" },
        { name: "IT" },
        { name: "EEE" },
        { name: "CHEMICAL" }
      ];
    }

    // 2. Fetch all faculty, HODs, and uploads
    const [allFaculty, allHods, allUploads] = await Promise.all([
      Faculty.find().select("-password").lean(),
      HOD.find().select("-password").lean(),
      Upload.find().lean()
    ]);

    const result = allDepts.map(deptObj => {
      const deptName = (deptObj.name || "").toUpperCase();

      // Find HOD of this department
      const deptHod = allHods.find(
        h => (h.department || "").toUpperCase() === deptName
      );

      // Find Faculty in this department
      const deptFaculty = allFaculty.filter(
        f => (f.department || "").toUpperCase() === deptName
      );

      // Combine members for this department
      const members = [];

      if (deptHod) {
        members.push({
          ...deptHod,
          role: "HOD",
          designation: deptHod.designation || "Professor & Head of Department",
          isHod: true
        });
      }

      deptFaculty.forEach(f => {
        if (!members.some(m => String(m._id) === String(f._id))) {
          members.push({
            ...f,
            role: "FACULTY",
            designation: f.designation || "Assistant Professor",
            isHod: false
          });
        }
      });

      // Calculate uploads and credits per member & for the department
      const deptUploads = allUploads.filter(
        u => (u.department || "").toUpperCase() === deptName
      );

      let deptTotalCredits = 0;
      let deptPublications = 0;
      let deptBooks = 0;
      let deptConferences = 0;
      let deptWorkshops = 0;
      let deptNptel = 0;
      let deptPatents = 0;

      const membersWithStats = members.map(member => {
        const memberUploads = deptUploads.filter(
          u => String(u.faculty) === String(member._id) ||
               (u.metadata?.authorName && u.metadata.authorName.toLowerCase() === member.name?.toLowerCase())
        );

        const approvedUploads = memberUploads.filter(
          u => u.status === "ADMIN_APPROVED" || u.status === "HOD_APPROVED" || u.status === "APPROVED"
        );

        const memberCredits = approvedUploads.reduce((sum, u) => sum + (Number(u.credits) || 0), 0) || (member.totalCredits || 0);

        const booksCount = memberUploads.filter(u => (u.category || "").toLowerCase().includes("book")).length;
        const pubCount = memberUploads.filter(u => (u.category || "").toLowerCase().includes("pub") || (u.category || "").toLowerCase().includes("journal")).length;
        const confCount = memberUploads.filter(u => (u.category || "").toLowerCase().includes("conf")).length;
        const workCount = memberUploads.filter(u => (u.category || "").toLowerCase().includes("work") || (u.category || "").toLowerCase().includes("fdp")).length;
        const nptelCount = memberUploads.filter(u => (u.category || "").toLowerCase().includes("nptel") || (u.category || "").toLowerCase().includes("course")).length;
        const patentCount = memberUploads.filter(u => (u.category || "").toLowerCase().includes("patent") || (u.category || "").toLowerCase().includes("grant")).length;

        deptTotalCredits += memberCredits;
        deptPublications += pubCount;
        deptBooks += booksCount;
        deptConferences += confCount;
        deptWorkshops += workCount;
        deptNptel += nptelCount;
        deptPatents += patentCount;

        return {
          _id: member._id,
          name: member.name,
          email: member.email,
          employeeId: member.employeeId || member.regId || "N/A",
          designation: member.designation,
          department: deptName,
          role: member.role,
          isHod: Boolean(member.isHod),
          profileImage: member.profileImage || "",
          googleScholar: member.googleScholar || "",
          vidwanId: member.vidwanId || "",
          scopusId: member.scopusId || "",
          totalCredits: memberCredits,
          totalSubmissions: memberUploads.length,
          approvedCount: approvedUploads.length,
          stats: {
            books: booksCount,
            publications: pubCount,
            conferences: confCount,
            workshops: workCount,
            nptel: nptelCount,
            patents: patentCount
          }
        };
      });

      // Sort members by highest credits first
      membersWithStats.sort((a, b) => b.totalCredits - a.totalCredits);

      return {
        department: deptName,
        facultyCount: membersWithStats.length,
        hodName: deptHod?.name || "Not Assigned",
        hodEmail: deptHod?.email || "",
        totalCredits: deptTotalCredits,
        stats: {
          publications: deptPublications,
          books: deptBooks,
          conferences: deptConferences,
          workshops: deptWorkshops,
          nptel: deptNptel,
          patents: deptPatents
        },
        faculty: membersWithStats
      };
    });

    res.json({
      role: userRole,
      userDepartment: userDept,
      departments: result
    });
  } catch (err) {
    console.error("GET DEPARTMENT ANALYTICS ERROR:", err);
    res.status(500).json({ message: "Failed to load department analytics" });
  }
};

/* =====================================================
   GET FULL FACULTY / HOD PORTFOLIO & WORK DETAILS
===================================================== */
exports.getFacultyPortfolio = async (req, res) => {
  try {
    const { id } = req.params;

    // Search in Faculty, HOD, and User
    let user = await Faculty.findById(id).select("-password").lean();
    let userRole = "FACULTY";

    if (!user) {
      user = await HOD.findById(id).select("-password").lean();
      userRole = "HOD";
    }
    if (!user) {
      user = await User.findById(id).select("-password").lean();
      userRole = user?.role || "USER";
    }

    if (!user) {
      return res.status(404).json({ message: "Faculty member not found" });
    }

    // Role-based authorization: HOD can only view members of their own department
    if (req.user.role === "HOD" && (user.department || "").toUpperCase() !== (req.user.department || "").toUpperCase()) {
      return res.status(403).json({ message: "Access restricted to your department only" });
    }

    // Fetch all uploads by this user
    const uploads = await Upload.find({
      $or: [
        { faculty: user._id },
        { "metadata.authorName": user.name }
      ]
    }).sort({ createdAt: -1 }).lean();

    // Group into categorized portfolio cards
    const portfolio = {
      books: uploads.filter(u => (u.category || "").toLowerCase().includes("book")),
      publications: uploads.filter(u => (u.category || "").toLowerCase().includes("pub") || (u.category || "").toLowerCase().includes("journal")),
      conferences: uploads.filter(u => (u.category || "").toLowerCase().includes("conf")),
      nptel: uploads.filter(u => (u.category || "").toLowerCase().includes("nptel") || (u.category || "").toLowerCase().includes("course")),
      workshops: uploads.filter(u => (u.category || "").toLowerCase().includes("work") || (u.category || "").toLowerCase().includes("fdp") || (u.category || "").toLowerCase().includes("seminar")),
      patents: uploads.filter(u => (u.category || "").toLowerCase().includes("patent") || (u.category || "").toLowerCase().includes("grant")),
      others: uploads.filter(u => {
        const cat = (u.category || "").toLowerCase();
        return !cat.includes("book") && !cat.includes("pub") && !cat.includes("journal") &&
               !cat.includes("conf") && !cat.includes("nptel") && !cat.includes("course") &&
               !cat.includes("work") && !cat.includes("fdp") && !cat.includes("seminar") &&
               !cat.includes("patent") && !cat.includes("grant");
      })
    };

    const approvedUploads = uploads.filter(
      u => u.status === "ADMIN_APPROVED" || u.status === "HOD_APPROVED" || u.status === "APPROVED"
    );

    const totalCredits = approvedUploads.reduce((sum, u) => sum + (Number(u.credits) || 0), 0) || (user.totalCredits || 0);

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId || user.regId || "N/A",
        department: (user.department || "").toUpperCase(),
        designation: user.designation || (userRole === "HOD" ? "Professor & Head of Department" : "Faculty Member"),
        role: userRole,
        profileImage: user.profileImage || "",
        googleScholar: user.googleScholar || "",
        vidwanId: user.vidwanId || "",
        scopusId: user.scopusId || "",
        createdAt: user.createdAt
      },
      stats: {
        totalCredits,
        totalUploads: uploads.length,
        approvedCount: approvedUploads.length,
        pendingCount: uploads.length - approvedUploads.length,
        booksCount: portfolio.books.length,
        publicationsCount: portfolio.publications.length,
        conferencesCount: portfolio.conferences.length,
        workshopsCount: portfolio.workshops.length,
        nptelCount: portfolio.nptel.length,
        patentsCount: portfolio.patents.length
      },
      portfolio
    });
  } catch (err) {
    console.error("GET FACULTY PORTFOLIO ERROR:", err);
    res.status(500).json({ message: "Failed to load faculty portfolio" });
  }
};

/* =====================================================
   EXCEL EXPORTS
===================================================== */
exports.downloadFacultyReport = async (req, res) => {
  try {
    const facultyId = req.query.facultyId || req.user.id;
    const { category, year } = req.query;

    let filter = {
      faculty: facultyId,
      status: { $in: ["HOD_APPROVED", "ADMIN_APPROVED"] }
    };

    if (category && category.trim() !== "") {
      filter.category = new RegExp(category.trim(), "i");
    }

    if (year && !isNaN(year)) {
      filter.year = Number(year);
    }

    const uploads = await Upload.find(filter).sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Faculty Activities");

    sheet.columns = [
      { header: "Category", key: "category", width: 20 },
      { header: "Title", key: "title", width: 40 },
      { header: "Credits", key: "credits", width: 10 },
      { header: "Status", key: "status", width: 15 },
      { header: "Year", key: "year", width: 10 },
      { header: "Date", key: "date", width: 20 }
    ];

    uploads.forEach(upload => {
      sheet.addRow({
        category: upload.category,
        title: upload.title,
        credits: upload.credits,
        status: upload.status,
        year: upload.year || new Date(upload.createdAt).getFullYear(),
        date: new Date(upload.createdAt).toLocaleDateString()
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=faculty_activities.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Excel download failed" });
  }
};

exports.downloadDepartmentReport = async (req, res) => {
  try {
    const department = req.user.department;

    const uploads = await Upload.find({
      department,
      status: { $in: ["HOD_APPROVED", "ADMIN_APPROVED"] }
    }).populate("faculty", "name employeeId");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Department Activities");

    sheet.columns = [
      { header: "Faculty Name", key: "faculty", width: 25 },
      { header: "Category", key: "category", width: 20 },
      { header: "Title", key: "title", width: 40 },
      { header: "Credits", key: "credits", width: 10 },
      { header: "Status", key: "status", width: 15 },
      { header: "Year", key: "year", width: 10 },
      { header: "Date", key: "date", width: 20 }
    ];

    uploads.forEach(upload => {
      sheet.addRow({
        faculty: upload.faculty?.name || "",
        category: upload.category,
        title: upload.title,
        credits: upload.credits,
        status: upload.status,
        year: upload.year || new Date(upload.createdAt).getFullYear(),
        date: new Date(upload.createdAt).toLocaleDateString()
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=department_activities.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Department download failed" });
  }
};