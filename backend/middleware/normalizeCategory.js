const CATEGORY_MAP = require("../constants/categoryMap");

function normalizeCategory(req, res, next) {

  if (!req.body.category) {
    return next();
  }

  let key = req.body.category
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "");

  if (CATEGORY_MAP[key]) {
    req.body.category = CATEGORY_MAP[key];
  }

  next();
}

module.exports = normalizeCategory;