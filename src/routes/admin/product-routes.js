const express = require("express");
const router = express.Router();
const product = require("../../controllers/admin/product-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getAdmin } = require("../../middlewares/getAdmin-middleware");

router.post(
  "/admin/products",
  verifyToken,
  getAdmin,
  product.createProductByAdmin
);
router.get(
  "/admin/products",
  verifyToken,
  getAdmin,
  product.getProductsByAdmin
);
router.get(
  "/admin/products/:slug",
  verifyToken,
  getAdmin,
  product.getOneProductByAdmin
);
router.put(
  "/admin/products/:slug",
  verifyToken,
  getAdmin,
  product.updateProductByAdmin
);
router.delete(
  "/admin/products/:slug",
  verifyToken,
  getAdmin,
  product.deletedProductByAdmin
);

module.exports = router;
