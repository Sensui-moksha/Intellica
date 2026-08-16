const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const authMiddleware = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authMiddleware);

// Publicly readable categories (Faculty, HOD, Admin)
router.get("/", categoryController.getCategories);

// Admin-only Category routes
router.post("/", categoryController.createCategory);
router.post("/bulk-delete", categoryController.bulkDeleteCategories);
router.put("/:id", categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);

// Admin-only Subcategory routes
router.post("/:id/subcategories", categoryController.addSubcategory);
router.put("/:id/subcategories", categoryController.setSubcategories);
router.put("/:id/subcategories/:subId", categoryController.updateSubcategory);
router.delete("/:id/subcategories/:subId", categoryController.deleteSubcategory);

module.exports = router;
