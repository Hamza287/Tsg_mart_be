const mongoose = require("mongoose");

const SubCategorySchema = new mongoose.Schema(
  {
    cover: {
      _id: {
        type: String,
        required: [true, "Image id is required."],
      },
      url: {
        type: String,
        required: [true, "Image url is required."],
      },
    },
    name: {
      type: String,
      required: [true, "Name is required."],
      maxlength: [100, "Name cannot exceed 100 characters."],
    },
    metaTitle: {
      type: String,
      required: [true, "Meta Title is required."],
      maxlength: [100, "Meta Title cannot exceed 100 characters."],
    },
    description: {
      type: String,
      required: [true, "Description is required."],
      maxlength: [500, "Description cannot exceed 500 characters."],
    },
    metaDescription: {
      type: String,
      required: [true, "Meta Description is required."],
      maxlength: [200, "Meta Description cannot exceed 200 characters."],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      default: "active",
      enum: ["active", "inactive"],
      required: true,
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    childCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChildCategory",
      },
    ],
  },
  { timestamps: true }
);

const SubCategory =
  mongoose.models.SubCategory ||
  mongoose.model("SubCategory", SubCategorySchema);
module.exports = SubCategory;
