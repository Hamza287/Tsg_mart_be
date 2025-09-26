const User = require("../../models/User");
const Order = require("../../models/Order");

/*  Get all users managed by admin */
const getUsersByAdmin = async (req, res) => {
  try {
    const { limit = 10, page = 1, search = "", role } = req.query;
    const skip = parseInt(limit) * (parseInt(page) - 1) || 0;

    let query = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (role) {
      if (role === "admin") {
        query.role = { $in: ["admin", "super-admin"] };
      } else {
        query.role = role;
      }
    }

    const totalUserCounts = await User.countDocuments(query);

    const users = await User.find(query, null, {
      skip: skip,
      limit: parseInt(limit),
    }).sort({
      createdAt: -1,
    });
    const usersWithOrders = await Promise.all(
      users.map(async (user) => {
        const orderCount = await Order.countDocuments({ "user._id": user._id });
        return { ...user.toObject(), totalOrders: orderCount };
      })
    );
    return res.status(200).json({
      success: true,
      data: usersWithOrders,
      count: Math.ceil(totalUserCounts / parseInt(limit)),
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/*  Get orders of a user managed by admin */
const getUserOrdersByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10, page = 1 } = req.query;
    const skip = parseInt(limit) * (parseInt(page) - 1) || 0;

    const currentUser = await User.findById(id);
    if (!currentUser) {
      return res
        .status(404)
        .json({ success: false, message: "User Not Found" });
    }

    const totalOrders = await Order.countDocuments({ "user._id": id });
    const orders = await Order.find({ "user._id": id }, null, {
      skip: skip,
      limit: parseInt(limit),
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      user: currentUser,
      orders,
      count: Math.ceil(totalOrders / parseInt(limit)),
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/*  Update a user's role by admin */
const updateUserRoleByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const userToUpdate = await User.findById(id);

    if (!userToUpdate) {
      return res
        .status(404)
        .json({ success: false, message: "User Not Found." });
    }

    if (userToUpdate.role === "super-admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot Change The Role Of A Super Admin.",
      });
    }

    const newRole = userToUpdate.role === "user" ? "admin" : "user";
    // 🚫 Vendor cannot become Admin
    if (userToUpdate.role === "vendor" && newRole === "admin") {
      return res.status(403).json({
        success: false,
        message: "A vendor cannot be assigned as admin.",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role: newRole },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: `${updatedUser.firstName} Is Now ${newRole}.`,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUsersByAdmin,
  getUserOrdersByAdmin,
  updateUserRoleByAdmin,
};
