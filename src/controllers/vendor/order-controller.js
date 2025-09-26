const Orders = require("../../models/Order");
const Shop = require("../../models/Shop");
const CourierInfo = require("../../models/CourierInfo");

/*  Get Orders (Vendor) */
const getOrdersByVendor = async (req, res) => {
  try {
    const shop = await Shop.findOne({ vendor: req.vendor._id.toString() });
    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
    }
    const { limit = 10, page = 1, search = "" } = req.query;

    const skip = parseInt(limit) * (parseInt(page) - 1) || 0;
    const pipeline = [
      {
        $match: {
          "items.shop": shop._id,
          $or: [
            { "user.firstName": { $regex: new RegExp(search, "i") } },
            { "user.lastName": { $regex: new RegExp(search, "i") } },
          ],
        },
      },
    ];
    const totalOrderCount = await Orders.aggregate([
      ...pipeline,
      {
        $count: "totalOrderCount",
      },
    ]);

    const count =
      totalOrderCount.length > 0 ? totalOrderCount[0].totalOrderCount : 0;

    const orders = await Orders.aggregate([
      ...pipeline,
      {
        $sort: { createdAt: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: parseInt(limit),
      },
    ]);
    return res.status(200).json({
      success: true,
      data: orders,
      total: count,
      count: Math.ceil(count / parseInt(limit)),
      currentPage: page,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
/*  Update Order by ID (Vendor) */
const updateOrderByVendor = async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;

    const order = await Orders.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order Updated",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
const getOrderByVendor = async (req, res) => {
  try {
    if (!req.vendor || !req.vendor.shop) {
      return res.status(400).json({
        success: false,
        message: "Vendor shop not found",
      });
    }
    console.log(req.vendor);
    const vendorShopId = req.vendor.shop.toString();
    const id = await req.params.id;
    const order = await Orders.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order Not Found",
      });
    }

    const vendorItems = order.items.filter((item) => {
      return item.shop && item.shop.toString() === vendorShopId;
    });

    if (!vendorItems.length) {
      return res.status(403).json({
        success: false,
        message: "You have no products in this order",
      });
    }
    const courierInfo = await CourierInfo.find({
      orderId: id,
      vendorId: req.vendor._id.toString(),
    });
    return res.status(200).json({
      success: true,
      data: {
        ...order.toObject(),
        items: vendorItems,
      },
      courierInfo,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
module.exports = {
  getOrdersByVendor,
  updateOrderByVendor,
  getOrderByVendor,
};
