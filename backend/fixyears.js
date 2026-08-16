const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Upload = require("./models/Upload");
  const uploads = await Upload.find({});
  let fixed = 0;

  for (const u of uploads) {
    let year = null;
    const m = u.metadata || {};

    // ✅ metadata.year first చూడండి
    if (m.year && !isNaN(Number(m.year))) year = Number(m.year);
    else if (m.monthYear)           year = parseInt(m.monthYear.split("-")[0]);
    else if (m.publicationMonthYear) year = parseInt(m.publicationMonthYear.split("-")[0]);
    else if (m.fromDate)            year = new Date(m.fromDate).getFullYear();
    else if (m.startDate)           year = new Date(m.startDate).getFullYear();
    else if (m.date)                year = new Date(m.date).getFullYear();
    else if (m.toDate)              year = new Date(m.toDate).getFullYear();
    else if (m.endDate)             year = new Date(m.endDate).getFullYear();
    else if (m.publishedDate)       year = new Date(m.publishedDate).getFullYear();
    else if (m.completionDate)      year = new Date(m.completionDate).getFullYear();

    if (year && year !== u.year) {
      await Upload.updateOne({ _id: u._id }, { year });
      fixed++;
      console.log(`Fixed: ${u.title} | category: ${u.category} | Old: ${u.year} | New: ${year}`);
    }
  }

  console.log("Total fixed:", fixed);
  mongoose.disconnect();
});