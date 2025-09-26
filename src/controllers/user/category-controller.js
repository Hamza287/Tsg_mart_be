const User = require("../../models/User");
const Categories = require("../../models/Category");

//  Get All Header Categories
const getAllHeaderCategories = async (req, res) => {
  try {
    const userCount = await User.countDocuments({ status: "active" });

    const categories = await Categories.find({ status: "active" })
      .sort({
        createdAt: -1,
      })
      .select(["name", "slug", "subCategories"])
      .populate({ path: "subCategories", select: ["name", "slug"] });

    res.status(200).json({
      success: true,
      data: categories,
      ...(!userCount && {
        adminPopup: true,
      }),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

//  Get All Categories (Public or Admin)
const getAllCategories = async (req, res) => {
  try {
    const categories = await Categories.find({ status: "active" })
      .sort({
        createdAt: -1,
      })
      .select(["name", "slug", "cover", "subCategories"])
      .populate({
        path: "subCategories",
        select: ["name", "slug", "cover", "childCategories"],
        populate: {
          path: "childCategories",
          select: ["name", "slug", "cover"],
        },
      });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

//  Get Category By Slug (Public)
const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const category = await Categories.findOne({ slug })
      .select([
        "name",
        "description",
        "metaTitle",
        "metaDescription",
        "cover",
        "slug",
        "module",
      ])
      .populate({
        path: "subCategories",
        select: ["name", "slug", "cover"],
      });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category Not Found",
      });
    }

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Categories (Public)
const getCategories = async (req, res) => {
  try {
    const { limit = 10, page = 1, search = "" } = req.query;

    const skip = parseInt(limit) || 10;
    const query = {
      name: { $regex: search, $options: "i" },
      status: "active",
    };
    const totalCategories = await Categories.find(query);

    const categories = await Categories.find(query, null, {
      skip: skip * (parseInt(page) - 1 || 0),
      limit: skip,
    }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: categories,
      count: Math.ceil(totalCategories.length / skip),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

//  Get Only Slugs of All Active Categories
const getCategoriesSlugs = async (req, res) => {
  try {
    const categories = await Categories.find({ status: "active" }).select(
      "slug"
    );

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
module.exports = {
  getAllHeaderCategories,
  getAllCategories,
  getCategoryBySlug,
  getCategories,
  getCategoriesSlugs,
};
