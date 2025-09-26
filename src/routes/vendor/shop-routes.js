const express = require("express");
const router = express.Router();
const shop = require("../../controllers/vendor/shop-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getVendor } = require("../../middlewares/getVendor-middleware");

router.post("/vendor/shops", verifyToken, getVendor, shop.createShopByVendor);
router.get(
  "/vendor/shop/stats",
  verifyToken,
  getVendor,
  shop.getShopStatsByVendor
);
router.get("/vendor/shop", verifyToken, getVendor, shop.getOneShopByVendor);
router.put(
  "/vendor/shops/:slug",
  verifyToken,
  getVendor,
  shop.updateOneShopByVendor
);
router.delete(
  "/vendor/shops/:slug",
  verifyToken,
  getVendor,
  shop.deleteOneShopByVendor
);

module.exports = router;
