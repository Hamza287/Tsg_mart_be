const Product = require("../../models/Product");
const Shop = require("../../models/Shop");
const Category = require("../../models/Category");
const Brand = require("../../models/Brand");
const { multiFilesDelete } = require("../../utils/uploader-util");

/*     Get All Products by Vendor    */
const getProductsByVendor = async (req, res) => {
  try {
    const shop = await Shop.findOne({
      vendor: req.vendor._id.toString(),
    });
    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
    }
    const {
      status: statusQuery,
      page: pageQuery,
      limit: limitQuery,
      search: searchQuery,
    } = req.query;

    const limit = parseInt(limitQuery) || 10;
    const page = parseInt(pageQuery) || 1;

    const skip = limit * (page - 1);
    let matchQuery = { shop: shop._id };
    if (statusQuery === "lowstock") {
      matchQuery.$or = [
        {
          $and: [{ type: "simple" }, { stockQuantity: { $lt: 30 } }],
        },
        {
          $and: [
            { type: "variable" },
            { "variants.stockQuantity": { $lt: 30 } },
          ],
        },
      ];
    } else if (statusQuery) {
      matchQuery.status = statusQuery;
    }
    const totalProducts = await Product.countDocuments({
      name: { $regex: searchQuery || "", $options: "i" },
      ...matchQuery,
    });

    const products = await Product.aggregate([
      {
        $match: {
          name: { $regex: searchQuery || "", $options: "i" },
          ...matchQuery,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: "reviews",
          localField: "reviews",
          foreignField: "_id",
          as: "reviews",
        },
      },
      {
        $addFields: {
          averageRating: { $avg: "$reviews.rating" },
          image: { $arrayElemAt: ["$images", 0] },
          variantWithLeastStock: {
            $reduce: {
              input: "$variants",
              initialValue: {
                stockQuantity: Number.MAX_VALUE,
                price: null,
                salePrice: null,
              },
              in: {
                $cond: [
                  { $lt: ["$$this.stockQuantity", "$$value.stockQuantity"] },
                  {
                    stockQuantity: "$$this.stockQuantity",
                    price: "$$this.price",
                    salePrice: "$$this.salePrice",
                  },
                  "$$value",
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          stockQuantity: {
            $cond: [
              { $eq: ["$type", "variable"] },
              "$variantWithLeastStock.stockQuantity",
              "$stockQuantity",
            ],
          },
          price: {
            $cond: [
              { $eq: ["$type", "variable"] },
              "$variantWithLeastStock.price",
              "$price",
            ],
          },
          salePrice: {
            $cond: [
              { $eq: ["$type", "variable"] },
              "$variantWithLeastStock.salePrice",
              "$salePrice",
            ],
          },
        },
      },

      {
        $project: {
          image: { url: "$image.url" },
          name: 1,
          slug: 1,
          status: 1,
          discount: 1,
          likes: 1,
          salePrice: 1,
          price: 1,
          averageRating: 1,
          vendor: 1,
          shop: 1,
          stockQuantity: 1,
          createdAt: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: products,
      total: totalProducts,
      count: Math.ceil(totalProducts / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/*     Create Product by Vendor    */
const createProductByVendor = async (req, res) => {
  try {
    const shop = await Shop.findOne({
      vendor: req.vendor._id.toString(),
    });

    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
    }
    if (shop.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "No Action Before You’re Approved",
      });
    }

    const data = await Product.create({
      ...req.body,
      shop: shop._id,
      likes: 0,
      status: "pending",
    });
    await Shop.findByIdAndUpdate(shop._id.toString(), {
      $addToSet: {
        products: data._id,
      },
    });
    res.status(201).json({
      success: true,
      message: "Product Created",
      data: data,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/*     Get Single Product by Vendor    */
const getOneProductVendor = async (req, res) => {
  try {
    const shop = await Shop.findOne({
      vendor: req.vendor._id.toString(),
    });
    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
    }

    const product = await Product.findOne({
      slug: req.params.slug,
      shop: shop._id,
    });
    const category = await Category.findById(product.category).select([
      "name",
      "slug",
    ]);
    const brand = await Brand.findById(product.brand).select("name");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Vendor Product Not Found",
      });
    }
    const getProductRatingAndReviews = () => {
      return Product.aggregate([
        {
          $match: { slug: req.params.slug },
        },
        {
          $lookup: {
            from: "reviews",
            localField: "reviews",
            foreignField: "_id",
            as: "reviews",
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            rating: { $avg: "$reviews.rating" },
            totalReviews: { $size: "$reviews" },
          },
        },
      ]);
    };

    const reviewReport = await getProductRatingAndReviews();
    return res.status(200).json({
      success: true,
      data: product,
      totalRating: reviewReport[0]?.rating,
      totalReviews: reviewReport[0]?.totalReviews,
      brand: brand,
      category: category,
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

/*     Update Product by Vendor    */
const updateProductByVendor = async (req, res) => {
  try {
    const shop = await Shop.findOne({
      vendor: req.vendor._id.toString(),
    });
    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
    }

    const { slug } = req.params;
    let currentProduct = await Product.findOne({
      slug,
    });
    const { ...body } = req.body;

    const updated = await Product.findOneAndUpdate(
      { slug: slug, shop: shop._id },
      {
        ...body,
        shop: shop._id,
        status: currentProduct.status === "published" ? "published" : "pending",
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      data: updated,
      message:
        currentProduct.status === "published"
          ? "Product updated successfully"
          : "Product submitted for review",
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

/*     Delete Product by Vendor    */
const deleteProductByVendor = async (req, res) => {
  try {
    const shop = await Shop.findOne({
      vendor: req.vendor._id.toString(),
    });
    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
    }
    const slug = req.params.slug;
    const product = await Product.findOne({
      slug: slug,
      shop: shop._id,
    });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Vendor Product Not Found",
      });
    }

    if (product && product.images && product.images.length > 0) {
      await multiFilesDelete(req, product.images);
    }
    const deleteProduct = await Product.deleteOne({ slug: slug });
    await Shop.findByIdAndUpdate(shop._id.toString(), {
      $pull: {
        products: product._id,
      },
    });
    if (!deleteProduct) {
      return res.status(400).json({
        success: false,
        message: "Product Deletion Failed",
      });
    }
    return res.status(204).json({
      success: true,
      message: "Product Deleted ",
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createProductByVendor,
  getProductsByVendor,
  getOneProductVendor,
  updateProductByVendor,
  deleteProductByVendor,
};
