const express = require("express");
const router = express.Router();
const brand = require("../../controllers/admin/brand-controller");

const verifyToken = require("../../middlewares/jwt-middleware");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");

router.post("/admin/brands", verifyToken, getAdmin, brand.createBrandByAdmin);

router.get("/admin/brands", verifyToken, getAdmin, brand.getBrandsByAdmin);

router.get(
  "/admin/brands/:slug",
  verifyToken,
  getAdmin,
  brand.getBrandBySlugByAdmin
);

router.put(
  "/admin/brands/:slug",
  verifyToken,
  getAdmin,
  brand.updateBrandBySlugByAdmin
);

router.delete(
  "/admin/brands/:slug",
  verifyToken,
  getAdmin,
  brand.deleteBrandBySlugByAdmin
);

router.get("/admin/all-brands", brand.getAllBrandsByAdmin);

module.exports = router;
