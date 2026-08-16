const Category = require("../models/Category");

const DEFAULT_CATEGORIES = [
  {
    name: "Publication",
    section: "rnd",
    key: "paperPublications",
    creditPoints: 30,
    description: "Journal and Conference research publications (Scopus, SCI, UGC)",
    subcategories: [
      { name: "Journal Article (SCI / Scopus Q1)", key: "journal_q1", creditPoints: 40, description: "Top quartile SCI / Scopus indexed peer-reviewed journal" },
      { name: "Journal Article (Scopus Q2)", key: "journal_q2", creditPoints: 35, description: "Second quartile Scopus indexed journal" },
      { name: "Journal Article (Scopus Q3)", key: "journal_q3", creditPoints: 30, description: "Third quartile Scopus indexed journal" },
      { name: "Journal Article (Scopus Q4)", key: "journal_q4", creditPoints: 25, description: "Fourth quartile Scopus indexed journal" },
      { name: "Journal Article (UGC-CARE / Peer-Reviewed)", key: "journal_ugc", creditPoints: 20, description: "UGC-CARE approved or recognized peer-reviewed journal" }
    ]
  },
  {
    name: "Conference",
    section: "professional",
    key: "conferences",
    creditPoints: 15,
    description: "International and National conference presentations and chairing",
    subcategories: [
      { name: "International Conference Presentation (Full Paper)", key: "conf_intl_present", creditPoints: 20, description: "International forum paper presentation" },
      { name: "National Conference Presentation", key: "conf_natl_present", creditPoints: 15, description: "National level conference presentation" },
      { name: "Session Chair / Keynote / Track Chair", key: "conf_chair", creditPoints: 25, description: "Session chairing or keynote speaker invitation" },
      { name: "Conference Organizing Secretary / Lead Organizer", key: "conf_organizer", creditPoints: 20, description: "Lead role in organizing national/international conference" }
    ]
  },
  {
    name: "Workshop",
    section: "professional",
    key: "workshops",
    creditPoints: 10,
    description: "Technical skill enhancement workshops (Attended / Organized)",
    subcategories: [
      { name: "5+ Days Advanced Technical Workshop (Hands-on)", key: "workshop_5days", creditPoints: 15, description: "Extended technical workshop (attended / organized)" },
      { name: "2-4 Days Technical Skill Workshop", key: "workshop_2to4days", creditPoints: 10, description: "Multi-day technical workshop" },
      { name: "1-Day Specialized Workshop", key: "workshop_1day", creditPoints: 5, description: "One-day workshop participation" },
      { name: "Workshop Lead Organizer / Coordinator", key: "workshop_organizer", creditPoints: 20, description: "Convenor / Coordinator of technical workshop" }
    ]
  },
  {
    name: "FDP",
    section: "rnd",
    key: "fdp",
    creditPoints: 15,
    description: "Faculty Development Programmes and advanced pedagogy courses",
    subcategories: [
      { name: "2-Week FDP (≥10 Days / ATAL / NPTEL / AICTE)", key: "fdp_2week", creditPoints: 20, description: "Two-week intensive pedagogy / advanced technical FDP" },
      { name: "1-Week FDP (5-9 Days)", key: "fdp_1week", creditPoints: 15, description: "One-week approved FDP" },
      { name: "Short Term Pedagogy / FDP (2-4 Days)", key: "fdp_short", creditPoints: 10, description: "Short-term faculty development programme" }
    ]
  },
  {
    name: "Book",
    section: "professional",
    key: "books",
    creditPoints: 25,
    description: "Authored books, edited volumes, and chapter contributions",
    subcategories: [
      { name: "Authored Book (International Publisher - IEEE / Springer / Wiley)", key: "book_authored_intl", creditPoints: 30, description: "Complete authored book published with international reputed publisher" },
      { name: "Authored Book (National Publisher with ISBN)", key: "book_authored_natl", creditPoints: 20, description: "Authored book published with national publisher" },
      { name: "Edited Volume / Book as Chief Editor", key: "edited_volume", creditPoints: 25, description: "Edited volume or conference proceedings book" },
      { name: "Book Chapter (Scopus / IEEE / Springer Indexed)", key: "book_chapter_scopus", creditPoints: 15, description: "Contributed chapter in indexed book volume" },
      { name: "Book Chapter (National Publisher / ISBN)", key: "book_chapter_natl", creditPoints: 10, description: "Contributed chapter in ISBN book" }
    ]
  },
  {
    name: "IPR",
    section: "rnd",
    key: "iprs",
    creditPoints: 30,
    description: "Patents (Granted/Published), Copyrights, and Industrial Designs",
    subcategories: [
      { name: "Patent Granted (International - USPTO/EPO)", key: "patent_intl_granted", creditPoints: 40, description: "International patent granted" },
      { name: "Patent Granted (National - Indian Patent Office)", key: "patent_natl_granted", creditPoints: 30, description: "National patent granted" },
      { name: "Patent Published / Commercialized", key: "patent_published", creditPoints: 20, description: "Official patent published in gazette" },
      { name: "Copyright / Industrial Design / Trademark Registered", key: "copyright_granted", creditPoints: 15, description: "Registered copyright or design" }
    ]
  },
  {
    name: "ResearchProject",
    section: "rnd",
    key: "researchProjects",
    creditPoints: 35,
    description: "External sponsored major and minor research grants",
    subcategories: [
      { name: "Major Extramural Sponsored Project (> ₹10 Lakhs)", key: "project_major", creditPoints: 40, description: "DST, SERB, AICTE, ISRO sponsored major grant" },
      { name: "Minor Sponsored Research Project (≤ ₹10 Lakhs)", key: "project_minor", creditPoints: 25, description: "Government or industry sponsored minor research grant" },
      { name: "Internal / Institutional Seed Money Project", key: "project_seed", creditPoints: 15, description: "University seed funding for early research" }
    ]
  },
  {
    name: "Consultancy",
    section: "rnd",
    key: "consultancy",
    creditPoints: 25,
    description: "Corporate and industrial consultancy assignments",
    subcategories: [
      { name: "High Value Industrial Consultancy (> ₹5 Lakhs)", key: "consultancy_high", creditPoints: 35, description: "Major industrial consultancy executed" },
      { name: "Corporate Technical Consultancy (₹1-5 Lakhs)", key: "consultancy_mid", creditPoints: 25, description: "Industry testing and technical advisory" },
      { name: "Advisory / Technical Service Consultancy (< ₹1 Lakh)", key: "consultancy_basic", creditPoints: 15, description: "Consultancy and professional advisory" }
    ]
  },
  {
    name: "NPTEL",
    section: "professional",
    key: "nptel",
    creditPoints: 15,
    description: "NPTEL, SWAYAM, and MOOC certifications (Elite, Gold, Silver)",
    subcategories: [
      { name: "NPTEL / SWAYAM Elite + Gold (Top 1-2%)", key: "nptel_gold", creditPoints: 25, description: "Score ≥ 90% in NPTEL / SWAYAM certification" },
      { name: "NPTEL / SWAYAM Elite + Silver (Top 5%)", key: "nptel_silver", creditPoints: 20, description: "Score 75-89% in NPTEL / SWAYAM certification" },
      { name: "NPTEL / SWAYAM Elite (60-74%)", key: "nptel_elite", creditPoints: 15, description: "Elite certification score" },
      { name: "NPTEL / Coursera / edX Successfully Completed", key: "nptel_completed", creditPoints: 10, description: "Successful course completion" }
    ]
  },
  {
    name: "DoctoralThesis",
    section: "rnd",
    key: "doctoralThesis",
    creditPoints: 25,
    description: "Doctoral scholar supervision and PhD degree guidance",
    subcategories: [
      { name: "PhD Degree Awarded as Principal Supervisor", key: "phd_awarded_main", creditPoints: 35, description: "Sole or primary PhD supervisor" },
      { name: "PhD Degree Awarded as Co-Supervisor", key: "phd_awarded_co", creditPoints: 25, description: "Joint / Co-supervision of doctoral candidate" },
      { name: "Ongoing Doctoral Scholar Supervision (Active)", key: "phd_ongoing", creditPoints: 15, description: "Registered scholar guidance" }
    ]
  },
  {
    name: "HonorsAwards",
    section: "professional",
    key: "honorsAwards",
    creditPoints: 20,
    description: "National, State, and Institutional awards and recognitions",
    subcategories: [
      { name: "International / Global Prestigious Award", key: "award_intl", creditPoints: 30, description: "Recognized international academic award" },
      { name: "National / State Level Academic Award", key: "award_natl", creditPoints: 20, description: "Government or national society award" },
      { name: "Institutional / Best Teacher / Researcher Award", key: "award_inst", creditPoints: 15, description: "University or college excellence award" }
    ]
  },
  {
    name: "GuestLecture",
    section: "professional",
    key: "guestLectures",
    creditPoints: 10,
    description: "Keynote addresses, expert talks, and resource person deliveries",
    subcategories: [
      { name: "International Keynote / Expert Session", key: "lecture_intl", creditPoints: 20, description: "Keynote speech at international conference/university" },
      { name: "National Level Invited Expert Talk (3+ hrs)", key: "lecture_natl", creditPoints: 15, description: "Resource person at national workshop/FDP" },
      { name: "Expert Talk / Webinar Resource Person (1-2 hrs)", key: "lecture_standard", creditPoints: 10, description: "Technical guest lecture delivery" }
    ]
  },
  {
    name: "Seminar",
    section: "professional",
    key: "seminars",
    creditPoints: 10,
    description: "Academic seminars organized or presented",
    subcategories: [
      { name: "National / International Seminar Lead Organizer", key: "seminar_organizer", creditPoints: 20, description: "Convenor / Organizer of academic seminar" },
      { name: "Technical Seminar Presentation", key: "seminar_presenter", creditPoints: 10, description: "Presenter at symposium / seminar" }
    ]
  },
  {
    name: "Webinar",
    section: "professional",
    key: "webinars",
    creditPoints: 5,
    description: "Online webinars and specialized academic sessions",
    subcategories: [
      { name: "Webinar Lead Resource Person / Key Speaker", key: "webinar_speaker", creditPoints: 15, description: "Subject expert speaker" },
      { name: "Webinar Organizer / Technical Host", key: "webinar_host", creditPoints: 10, description: "Organized departmental webinar" },
      { name: "Webinar Participant (with Assessment)", key: "webinar_participant", creditPoints: 5, description: "Certified webinar attendee" }
    ]
  },
  {
    name: "Certification",
    section: "professional",
    key: "certifications",
    creditPoints: 15,
    description: "Global industry professional certifications (AWS, Cisco, etc.)",
    subcategories: [
      { name: "Professional / Expert Level Certification (AWS Pro, CCIE, GCP Lead)", key: "cert_expert", creditPoints: 25, description: "Advanced industry credential" },
      { name: "Associate / Practitioner Global Certification", key: "cert_associate", creditPoints: 15, description: "Standard professional certification" },
      { name: "Foundational Industry Certification", key: "cert_foundational", creditPoints: 10, description: "Entry / foundational certification" }
    ]
  },
  {
    name: "ResearchPolicy",
    section: "rnd",
    key: "researchPolicy",
    creditPoints: 15,
    description: "Institutional research policy framing and contributions",
    subcategories: [
      { name: "National / State Policy Advisory Committee", key: "policy_national", creditPoints: 25, description: "Government research policy body" },
      { name: "Institutional Policy Document Author / Lead", key: "policy_institutional", creditPoints: 15, description: "Framing research/innovation policies" }
    ]
  },
  {
    name: "ProfessionalMembership",
    section: "rnd",
    key: "professionalMemberships",
    creditPoints: 10,
    description: "Senior and life memberships in IEEE, ACM, CSI, IETE",
    subcategories: [
      { name: "Fellow / Senior Member (IEEE, ACM, IETE)", key: "member_senior", creditPoints: 20, description: "Elevated senior membership status" },
      { name: "Life / Professional Member (IEEE, ACM, CSI)", key: "member_life", creditPoints: 10, description: "Active professional society membership" }
    ]
  },
  {
    name: "Incubation",
    section: "rnd",
    key: "incubation",
    creditPoints: 20,
    description: "Startup incubation, mentorship, and commercialization",
    subcategories: [
      { name: "Startup Founder / Co-Founder (Registered Company)", key: "startup_founder", creditPoints: 35, description: "Incubated startup enterprise" },
      { name: "Incubation Mentor / Technology Advisor", key: "startup_mentor", creditPoints: 20, description: "Mentoring student/faculty ventures" }
    ]
  },
  {
    name: "MoU",
    section: "rnd",
    key: "mous",
    creditPoints: 20,
    description: "Institutional and corporate Memorandum of Understanding",
    subcategories: [
      { name: "International University / Industry Active MoU", key: "mou_intl", creditPoints: 30, description: "Active collaborative research/exchange MoU" },
      { name: "National Corporate / Institutional MoU", key: "mou_natl", creditPoints: 20, description: "Functional academic-industry MoU" }
    ]
  },
  {
    name: "Others",
    section: "professional",
    key: "others",
    creditPoints: 5,
    description: "Other recognized academic and research contributions",
    subcategories: [
      { name: "Institutional Committee Leadership / Head", key: "other_lead", creditPoints: 15, description: "Chairperson / Convener of major institute committees" },
      { name: "General Academic / Extension Activity", key: "other_general", creditPoints: 5, description: "Other academic activities" }
    ]
  }
];

/* ── CREATE CATEGORY ── */
exports.createCategory = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can create categories" });
    }
    const { name, section, key, creditPoints, description, subcategories } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const trimmedName = name.trim();
    const generatedKey = (key && key.trim())
      ? key.trim()
      : trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '');

    const existing = await Category.findOne({
      $or: [
        { name: new RegExp('^' + trimmedName + '$', 'i') },
        { key: generatedKey }
      ]
    });

    if (existing) {
      return res.status(400).json({ message: `Category "${trimmedName}" or key "${generatedKey}" already exists` });
    }

    const formattedSubcategories = Array.isArray(subcategories)
      ? subcategories.map(sub => ({
          name: sub.name?.trim() || "",
          key: sub.key?.trim() || sub.name?.toLowerCase().replace(/[^a-z0-9]/g, '_') || "",
          creditPoints: Number(sub.creditPoints ?? 10),
          description: sub.description?.trim() || ""
        })).filter(sub => sub.name)
      : [];

    const newCategory = await Category.create({
      name: trimmedName,
      section: section || "rnd",
      key: generatedKey,
      creditPoints: Number(creditPoints ?? 10),
      description: description?.trim() || "",
      subcategories: formattedSubcategories,
      isActive: true
    });

    res.status(201).json({ message: `Category "${trimmedName}" created successfully`, category: newCategory });
  } catch (err) {
    console.error("Error creating category:", err);
    res.status(500).json({ message: err.message || "Failed to create category" });
  }
};

/* ── GET CATEGORIES ── */
exports.getCategories = async (req, res) => {
  try {
    let categories = await Category.find().sort({ section: 1, name: 1 });

    if (!categories || categories.length === 0) {
      await Category.insertMany(DEFAULT_CATEGORIES);
      categories = await Category.find().sort({ section: 1, name: 1 });
    } else {
      // Auto-migrate: If any default categories are missing subcategories, populate them
      for (const defCat of DEFAULT_CATEGORIES) {
        const found = categories.find(c => c.key === defCat.key || c.name.toLowerCase() === defCat.name.toLowerCase());
        if (found && (!found.subcategories || found.subcategories.length === 0)) {
          found.subcategories = defCat.subcategories;
          await found.save();
        }
      }
      categories = await Category.find().sort({ section: 1, name: 1 });
    }

    res.json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};

/* ── UPDATE CATEGORY ── */
exports.updateCategory = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can update categories" });
    }
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const { name, section, key, creditPoints, description, isActive, subcategories } = req.body;

    if (name && name.trim()) category.name = name.trim();
    if (section) category.section = section;
    if (key && key.trim()) category.key = key.trim();
    if (creditPoints !== undefined) category.creditPoints = Number(creditPoints);
    if (description !== undefined) category.description = description.trim();
    if (isActive !== undefined) category.isActive = isActive;
    if (Array.isArray(subcategories)) {
      category.subcategories = subcategories.map(sub => ({
        name: sub.name?.trim() || "",
        key: sub.key?.trim() || sub.name?.toLowerCase().replace(/[^a-z0-9]/g, '_') || "",
        creditPoints: Number(sub.creditPoints ?? 10),
        description: sub.description?.trim() || ""
      })).filter(sub => sub.name);
    }

    await category.save();

    res.json({ message: `Category "${category.name}" updated successfully`, category });
  } catch (err) {
    console.error("Error updating category:", err);
    res.status(500).json({ message: err.message || "Failed to update category" });
  }
};

/* ── DELETE CATEGORY ── */
exports.deleteCategory = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can delete categories" });
    }
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ message: `Category "${category.name}" deleted successfully` });
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({ message: "Failed to delete category" });
  }
};

/* ── BULK DELETE CATEGORIES ── */
exports.bulkDeleteCategories = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can perform bulk delete" });
    }
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No category IDs specified" });
    }

    const result = await Category.deleteMany({ _id: { $in: ids } });
    res.json({ message: `${result.deletedCount} categories deleted successfully`, deletedCount: result.deletedCount });
  } catch (err) {
    console.error("BULK DELETE CATEGORIES ERROR:", err);
    res.status(500).json({ message: "Failed to bulk delete categories" });
  }
};

/* ── ADD SUBCATEGORY ── */
exports.addSubcategory = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can add subcategories" });
    }
    const { id } = req.params;
    const { name, key, creditPoints, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Subcategory name is required" });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const trimmedName = name.trim();
    const subKey = (key && key.trim())
      ? key.trim()
      : trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Check for duplicate subcategory name
    const exists = category.subcategories.some(s => s.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      return res.status(400).json({ message: `Subcategory "${trimmedName}" already exists in ${category.name}` });
    }

    const newSub = {
      name: trimmedName,
      key: subKey,
      creditPoints: Number(creditPoints ?? category.creditPoints ?? 10),
      description: description?.trim() || ""
    };

    category.subcategories.push(newSub);
    await category.save();

    res.status(201).json({
      message: `Subcategory "${trimmedName}" added successfully to ${category.name}`,
      category
    });
  } catch (err) {
    console.error("Error adding subcategory:", err);
    res.status(500).json({ message: err.message || "Failed to add subcategory" });
  }
};

/* ── UPDATE SUBCATEGORY ── */
exports.updateSubcategory = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can update subcategories" });
    }
    const { id, subId } = req.params;
    const { name, key, creditPoints, description } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const sub = category.subcategories.id(subId);
    if (!sub) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    if (name && name.trim()) sub.name = name.trim();
    if (key !== undefined) sub.key = key.trim();
    if (creditPoints !== undefined) sub.creditPoints = Number(creditPoints);
    if (description !== undefined) sub.description = description.trim();

    await category.save();

    res.json({
      message: `Subcategory "${sub.name}" updated successfully`,
      category
    });
  } catch (err) {
    console.error("Error updating subcategory:", err);
    res.status(500).json({ message: err.message || "Failed to update subcategory" });
  }
};

/* ── DELETE SUBCATEGORY ── */
exports.deleteSubcategory = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can delete subcategories" });
    }
    const { id, subId } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    category.subcategories = category.subcategories.filter(s => s._id.toString() !== subId);
    await category.save();

    res.json({
      message: "Subcategory deleted successfully",
      category
    });
  } catch (err) {
    console.error("Error deleting subcategory:", err);
    res.status(500).json({ message: err.message || "Failed to delete subcategory" });
  }
};

/* ── SET / REPLACE SUBCATEGORIES BATCH ── */
exports.setSubcategories = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only Admin can configure subcategories" });
    }
    const { id } = req.params;
    const { subcategories } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (!Array.isArray(subcategories)) {
      return res.status(400).json({ message: "subcategories must be an array" });
    }

    category.subcategories = subcategories.map(sub => ({
      name: sub.name?.trim() || "",
      key: sub.key?.trim() || sub.name?.toLowerCase().replace(/[^a-z0-9]/g, '_') || "",
      creditPoints: Number(sub.creditPoints ?? category.creditPoints ?? 10),
      description: sub.description?.trim() || ""
    })).filter(sub => sub.name);

    await category.save();

    res.json({
      message: `Subcategories updated for ${category.name}`,
      category
    });
  } catch (err) {
    console.error("Error setting subcategories:", err);
    res.status(500).json({ message: err.message || "Failed to configure subcategories" });
  }
};
