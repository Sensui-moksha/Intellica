function rankFaculty(facultyData) {

  const scored = facultyData.map(faculty => {

    let score = 0;

    /* ================= TOTAL CREDITS ================= */
    if (faculty.totalCredits > 50)      score += 100;
    else if (faculty.totalCredits > 30) score += 70;
    else if (faculty.totalCredits > 10) score += 50;
    else                                score += 20;

    /* ================= CORE ================= */

    // Publications
    if (faculty.publications > 5)      score += 50;
    else if (faculty.publications > 2) score += 30;
    else if (faculty.publications > 0) score += 10;

    // Conferences
    if (faculty.conferences > 3)      score += 30;
    else if (faculty.conferences > 1) score += 15;
    else if (faculty.conferences > 0) score += 5;

    // FDP
    if (faculty.fdps > 2)      score += 20;
    else if (faculty.fdps > 0) score += 10;

    

    // Workshops
    if (faculty.workshop > 5)      score += 20;
    else if (faculty.workshop > 2) score += 10;
    else if (faculty.workshop > 0) score += 5;

    // Books
    if (faculty.book > 2)      score += 25;
    else if (faculty.book > 0) score += 15;

    // NPTEL
    if (faculty.nptel > 3)      score += 15;
    else if (faculty.nptel > 0) score += 8;

    // Seminar
    if (faculty.seminar > 3)      score += 15;
    else if (faculty.seminar > 0) score += 8;

    // Webinar
    if (faculty.webinar > 5)      score += 10;
    else if (faculty.webinar > 0) score += 5;

    // Guest Lecture
    if (faculty.guestlecture > 3)      score += 15;
    else if (faculty.guestlecture > 0) score += 8;

    // Awards
    if (faculty.honorsawards > 2)      score += 30;
    else if (faculty.honorsawards > 0) score += 15;

    // Certification
    if (faculty.certification > 5)      score += 15;
    else if (faculty.certification > 0) score += 8;

    /* ================= R&D ================= */

    if (faculty.researchpolicy > 1) score += 15;
    else if (faculty.researchpolicy > 0) score += 8;

    if (faculty.membership > 2) score += 10;
    else if (faculty.membership > 0) score += 5;

    if (faculty.ipr > 2) score += 25;
    else if (faculty.ipr > 0) score += 15;

    if (faculty.consultancy > 1) score += 30;
    else if (faculty.consultancy > 0) score += 15;

    if (faculty.incubation > 1) score += 30;
    else if (faculty.incubation > 0) score += 15;

    if (faculty.researchprojects > 2) score += 25;
    else if (faculty.researchprojects > 0) score += 15;

    if (faculty.doctoralthesis > 1) score += 30;
    else if (faculty.doctoralthesis > 0) score += 15;

    if (faculty.mous > 2) score += 15;
    else if (faculty.mous > 0) score += 8;

    /* ================= OTHERS ================= */

    if (faculty.others > 5)      score += 15;
    else if (faculty.others > 2) score += 10;
    else if (faculty.others > 0) score += 5;

    return { ...faculty, score };
  });

  /* ================= SORT ================= */
  scored.sort((a, b) => b.score - a.score);

  return scored;
}

module.exports = { rankFaculty };