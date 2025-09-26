const Notifications = require("../../models/Notification");
const Products = require("../../models/Product");
const Orders = require("../../models/Order");
const Coupons = require("../../models/CouponCode");
const User = require("../../models/User");
const CourierInfo = require("../../models/CourierInfo");
const fs = require("fs");
const path = require("path");

const { sendEmail } = require("../../utils/mailer-util");
function isExpired(expirationDate) {
  const currentDateTime = new Date();
  return currentDateTime >= new Date(expirationDate);
}
function generateOrderNumber() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let orderNumber = "";

  orderNumber += alphabet.charAt(Math.floor(Math.random() * alphabet.length));

  for (let i = 0; i < 6; i++) {
    orderNumber += Math.floor(Math.random() * 10);
  }

  return orderNumber;
}
function readHTMLTemplate() {
  const htmlFilePath = path.join(
    process.cwd(),
    "src/email-templates",
    "order.html"
  );
  return fs.readFileSync(htmlFilePath, "utf8");
}

/*  Create Order */
const createOrder = async (req, res) => {
  try {
    const {
      items,
      user,
      currency,
      conversionRate,
      paymentMethod,
      paymentId,
      couponCode,
      totalItems,
      shipping: shippingFee,
      description,
      courierName,
      trackingId,
      trackingLink,
    } = req.body;

    const existingUser = await User.findOne({ email: user.email });

    if (existingUser?.role === "admin" || existingUser?.role === "vendor") {
      return res.status(403).json({
        success: false,
        message: "Admins and Vendors are not allowed to place orders.",
      });
    }

    if (!items || !items.length) {
      return res
        .status(400)
        .json({ success: false, message: "Please Provide Item(s)" });
    }

    const products = await Products.find({
      _id: { $in: items.map((item) => item.pid) },
    });

    const updatedItems = await Promise.all(
      items.map(async (item) => {
        const product = products.find((p) => p._id.toString() === item.pid);
        let price = product ? product.salePrice : 0;
        const total = price * item.quantity;

        let updatedProduct;

        if (!product.variants || product.variants.length === 0) {
          if (product.stockQuantity < item.quantity) {
            throw new Error(`Not enough stock for product: ${product.name}`);
          }

          updatedProduct = await Products.findOneAndUpdate(
            { _id: item.pid, stockQuantity: { $gte: item.quantity } },
            {
              $inc: {
                stockQuantity: -item.quantity,
                sold: item.quantity,
              },
            },
            { new: true, runValidators: true }
          ).exec();
        } else {
          const variantIndex = product.variants.findIndex(
            (v) => v._id.toString() === item.variantId
          );
          if (variantIndex === -1) {
            throw new Error(`Variant not found for product: ${product.name}`);
          }

          const variant = product.variants[variantIndex];
          price = variant.salePrice || product.salePrice;

          if (variant.stockQuantity < item.quantity) {
            throw new Error(
              `Not enough stock for ${product.name} - ${variant.name}`
            );
          }

          updatedProduct = await Products.findOneAndUpdate(
            { _id: item.pid, "variants._id": item.variantId },
            {
              $inc: {
                "variants.$.stockQuantity": -item.quantity,
                sold: item.quantity,
              },
            },
            { new: true, runValidators: true }
          ).exec();
        }

        return {
          ...item,
          total,
          shop: product?.shop,
          imageUrl: item.image,
        };
      })
    );

    const grandTotal = updatedItems.reduce(
      (acc, item) => acc + item.subtotal,
      0
    );
    let discount = 0;

    if (couponCode) {
      const couponData = await Coupons.findOne({ code: couponCode });

      const expired = isExpired(couponData.expire);
      if (expired) {
        return res
          .status(400)
          .json({ success: false, message: "Coupon Code Is Expired" });
      }

      await Coupons.findOneAndUpdate(
        { code: couponCode },
        { $addToSet: { usedBy: user.email } }
      );

      if (couponData && couponData.type === "percent") {
        const percentLess = couponData.discount;
        discount = (percentLess / 100) * grandTotal;
      } else if (couponData) {
        discount = couponData.discount;
      }
    }

    let discountedTotal = grandTotal - discount;
    discountedTotal = discountedTotal || 0;

    const orderNo = await generateOrderNumber();
    const orderCreated = await Orders.create({
      paymentMethod,
      paymentId,
      discount,
      currency,
      description: description || "",
      conversionRate,
      total: discountedTotal + Number(shippingFee),
      subTotal: grandTotal,
      shipping: shippingFee,
      items: updatedItems.map(({ image, ...others }) => ({
        image,
        ...others,
      })),
      user: existingUser ? { ...user, _id: existingUser._id } : user,
      totalItems,
      orderNo,
      status: "pending",
      courierName,
      trackingId,
      trackingLink,
    });

    if (existingUser) {
      await User.findByIdAndUpdate(existingUser._id, {
        $push: { orders: orderCreated._id },
      });
    }

    await Notifications.create({
      opened: false,
      title: `${user.firstName} ${user.lastName} placed an order from ${user.city}.`,
      paymentMethod,
      orderId: orderCreated._id,
      city: user.city,
      cover: user?.cover?.url || "",
    });

    let htmlContent = readHTMLTemplate();

    htmlContent = htmlContent.replace(
      /{{recipientName}}/g,
      `${user.firstName} ${user.lastName}`
    );

    let itemsHtml = "";
    updatedItems.forEach((item) => {
      itemsHtml += `
        <tr style='border-bottom: 1px solid #e4e4e4;'>
          <td style="border-radius: 8px; box-shadow: 0 0 5px rgba(0, 0, 0, 0.1); overflow: hidden; border-spacing: 0; border: 0">
            <img src="${item.imageUrl}" alt="${item.name}" style="width: 62px; height: 62px; object-fit: cover; border-radius: 8px;">
          </td>
          <td style=" padding: 10px; border-spacing: 0; border: 0">${item.name}</td>         
          <td style=" padding: 10px; border-spacing: 0; border: 0">${item.sku}</td>
          <td style=" padding: 10px; border-spacing: 0; border: 0">${item.quantity}</td>
          <td style=" padding: 10px; border-spacing: 0; border: 0">${item.salePrice}</td>
        </tr>
      `;
    });

    htmlContent = htmlContent.replace(/{{items}}/g, itemsHtml);
    htmlContent = htmlContent.replace(/{{grandTotal}}/g, orderCreated.subTotal);
    htmlContent = htmlContent.replace(/{{Shipping}}/g, orderCreated.shipping);
    htmlContent = htmlContent.replace(/{{subTotal}}/g, orderCreated.total);

    await sendEmail(user.email, "Your Order Confirmation", htmlContent);

    return res.status(201).json({
      success: true,
      message: "Order Placed",
      orderId: orderCreated._id,
      data: items.name,
      orderNo,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
/*  Get Order by ID */
const getOrderById = async (req, res) => {
  try {
    const id = req.params.id;
    const orderGet = await Orders.findById(id);

    if (!orderGet) {
      return res
        .status(404)
        .json({ success: false, message: "Order Not Found" });
    }
    const courierInfo = await CourierInfo.find({ orderId: id });

    return res.status(200).json({
      success: true,
      data: orderGet,
      courierInfo,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrder,
  getOrderById,
};
