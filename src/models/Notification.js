const mongoose = require("mongoose");

const NotificationsSchema = new mongoose.Schema(
  {
    opened: {
      type: Boolean,
      required: [true, "Open is required."],
    },
    title: {
      type: String,
      required: [true, "Title is required."],
      maxlength: [100, "Title cannot exceed 100 characters."],
    },
    orderId: {
      type: String,
      required: [true, "Order Id is required."],
    },
    cover: {
      _id: {
        type: String,
      },
      url: {
        type: String,
      },
    },
    city: {
      type: String,
      required: [true, "City is required."],
    },
    paymentMethod: {
      type: String,
      required: [true, "Payment Method is required."],
      enum: ["Stripe", "PayPal", "COD"],
    },
  },
  {
    timestamps: true,
  }
);

const Notifications =
  mongoose.models.Notifications ||
  mongoose.model("Notifications", NotificationsSchema);
module.exports = Notifications;
