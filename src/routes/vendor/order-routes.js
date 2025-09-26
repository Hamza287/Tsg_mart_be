const express = require("express");
const router = express.Router();
const order = require("../../controllers/vendor/order-controller");
const verifyToken = require("../../middlewares/jwt-middleware");
const { getVendor } = require("../../middlewares/getVendor-middleware");

router.get("/vendor/orders", verifyToken, getVendor, order.getOrdersByVendor);
router.put(
  "/vendor/orders/:id",
  verifyToken,
  getVendor,
  order.updateOrderByVendor
);
router.get(
  "/vendor/orders/:id",
  verifyToken,
  getVendor,
  order.getOrderByVendor
);

module.exports = router;
