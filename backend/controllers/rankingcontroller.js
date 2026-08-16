const Upload = require("../models/Upload");
const Faculty = require("../models/Faculty");
const HOD = require("../models/HOD");
const { rankFaculty } = require("../services/rankingDecisionTree");

exports.getRanking = async (req, res) => {
  try {

    // ✅ Step 1: All fully approved uploads (Institutional Admin approved)
    const uploads = await Upload.find({
      status: "ADMIN_APPROVED"
    });

    const facultyMap = {};

    uploads.forEach((u) => {
      const id = u.faculty?.toString();
      if (!id) return;

      if (!facultyMap[id]) {
        facultyMap[id] = {
          facultyId: id,
          name: "Unknown",
          department: u.department || "Unknown",
          createdByRole: u.createdByRole || "FACULTY",
          totalCredits: 0,
          publications: 0,
          conferences: 0,
          fdps: 0,
          workshop: 0,
          book: 0,
          nptel: 0,
          seminar: 0,
          webinar: 0,
          guestlecture: 0,
          honorsawards: 0,
          certification: 0,
          researchpolicy: 0,
          membership: 0,
          ipr: 0,
          consultancy: 0,
          incubation: 0,
          researchprojects: 0,
          doctoralthesis: 0,
          mous: 0,
          others: 0
        };
      }

      // ✅ Total credits
      facultyMap[id].totalCredits += Number(u.credits) || 0;

      // ✅ Category count
      const cat = (u.category || "").toLowerCase().trim();

      if (cat === "publication")      facultyMap[id].publications     += 1;
      if (cat === "conference")       facultyMap[id].conferences      += 1;
      if (cat === "fdp")              facultyMap[id].fdps             += 1;
      if (cat === "workshop")         facultyMap[id].workshop         += 1;
      if (cat === "book")             facultyMap[id].book             += 1;
      if (cat === "nptel")            facultyMap[id].nptel            += 1;
      if (cat === "seminar")          facultyMap[id].seminar          += 1;
      if (cat === "webinar")          facultyMap[id].webinar          += 1;
      if (cat === "guestlecture")     facultyMap[id].guestlecture     += 1;
      if (cat === "honorsawards")     facultyMap[id].honorsawards     += 1;
      if (cat === "certification")    facultyMap[id].certification    += 1;
      if (cat === "researchpolicy")   facultyMap[id].researchpolicy   += 1;
      if (cat === "membership")       facultyMap[id].membership       += 1;
      if (cat === "ipr")              facultyMap[id].ipr              += 1;
      if (cat === "consultancy")      facultyMap[id].consultancy      += 1;
      if (cat === "incubation")       facultyMap[id].incubation       += 1;
      if (cat === "researchprojects") facultyMap[id].researchprojects += 1;
      if (cat === "doctoralthesis")   facultyMap[id].doctoralthesis   += 1;
      if (cat === "mous")             facultyMap[id].mous             += 1;
      if (cat === "others")           facultyMap[id].others           += 1;
    });

    // ✅ Step 2: Fetch ALL approved faculty + HODs
    
      const allFaculty = await Faculty.find({ 
        isApproved: true,
        status: "APPROVED"  // ✅ Only fully approved faculty
      });
      const allHods = await HOD.find({ 
        isApproved: true,
        status: "APPROVED"  // ✅ Only fully approved HODs
      });
    // ✅ Step 3: Add all faculty to map (including 0 credits)
    [...allFaculty, ...allHods].forEach(f => {
      const id = f._id.toString();

      if (facultyMap[id]) {
        // Update name + department for existing entries
        facultyMap[id].name       = f.name       || "Unknown";
        facultyMap[id].department = f.department || "Unknown";
      } else {
        // Add faculty with 0 credits
        facultyMap[id] = {
          facultyId: id,
          name: f.name || "Unknown",
          department: f.department || "Unknown",
          createdByRole: f.role || "FACULTY",
          totalCredits: 0,
          publications: 0,
          conferences: 0,
          fdps: 0,
          workshop: 0,
          book: 0,
          nptel: 0,
          seminar: 0,
          webinar: 0,
          guestlecture: 0,
          honorsawards: 0,
          certification: 0,
          researchpolicy: 0,
          membership: 0,
          ipr: 0,
          consultancy: 0,
          incubation: 0,
          researchprojects: 0,
          doctoralthesis: 0,
          mous: 0,
          others: 0
        };
      }
    });

    const facultyList = Object.values(facultyMap).filter(f =>
      f.name !== "Unknown" && f.department !== "Unknown"
    );
    if (facultyList.length === 0) return res.json([]);

    // ✅ Step 4: Decision Tree scoring
    const scored = rankFaculty(facultyList);

    // ✅ Step 5: College rank (all faculty sorted by score)
    scored.sort((a, b) => b.score - a.score);
    scored.forEach((item, index) => {
      item.collegeRank  = index + 1;
      item.collegeTotal = scored.length;
    });

    // ✅ Step 6: Department grouping + rank
    const deptMap = {};
    scored.forEach(item => {
      const dept = (item.department || "Unknown").toUpperCase();
      if (!deptMap[dept]) deptMap[dept] = [];
      deptMap[dept].push(item);
    });

    const finalRanked = [];
    Object.keys(deptMap).forEach(dept => {
      const deptFaculties = deptMap[dept];
      deptFaculties.sort((a, b) => b.score - a.score);
      deptFaculties.forEach((item, index) => {
        item.rank            = index + 1;
        item.departmentTotal = deptFaculties.length;
        item.department      = dept;
      });
      finalRanked.push(...deptFaculties);
    });

    res.json(finalRanked);

  } catch (err) {
    console.error("Ranking error:", err);
    res.status(500).json({ message: "Ranking error" });
  }
};