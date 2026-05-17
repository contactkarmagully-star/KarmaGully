import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import { Resend } from "resend";
import axios from "axios";
import cors from "cors";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  app.use(cors({
  origin: [
    "https://karmagully.studio",
    "https://karmagully-website.onrender.com",
    'https://www.karmagully.studio',
    "https://karmagully-website.vercel.app"
  ],
  methods: ["GET", "POST"],
  credentials: true
}));

  // Resend Initialization
  const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

  // Razorpay Initialization
  const razorpayKeyId =
    process.env.RAZORPAY_KEY_ID ||
    process.env.VITE_RAZORPAY_KEY_ID;

  const razorpayKeySecret =
    process.env.RAZORPAY_KEY_SECRET;

  const razorpay = razorpayKeyId
    ? new Razorpay({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret,
      })
    : null;

  // ---------------------------------------------------
  // ORDER NOTIFICATIONS
  // ---------------------------------------------------

  app.post("/api/notifications/order", async (req, res) => {
    const { order, customerEmail, customerName } = req.body;

    try {

      // EMAIL NOTIFICATION
      if (resend) {
        try {

          await resend.emails.send({
            from: "KARMAGULLY <orders@resend.dev>",
            to: customerEmail,
            subject: "ORDER CONFIRMED | KARMAGULLY",

            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
                <h1 style="color: #9333ea;">KARMAGULLY</h1>

                <p>Hi ${customerName},</p>

                <p>
                  Your order <strong>${order.id}</strong>
                  has been received and is being processed.
                </p>

                <hr />

                <h3>Order Details</h3>

                <p>Total Amount: ₹${order.totalAmount}</p>

                <p>
                  Shipping Address:
                  ${order.customerInfo.address},
                  ${order.customerInfo.city}
                </p>

                <p>Estimated Delivery: 4-7 Days</p>

                <hr />

                <p>
                  Elevate your aesthetic,
                  <br/>
                  Team KarmaGully
                </p>
              </div>
            `,
          });

          console.log(
            "Email sent successfully to",
            customerEmail
          );

        } catch (emailErr) {

          console.error(
            "Resend Email Error:",
            emailErr
          );

        }
      }

      // TELEGRAM ORDER NOTIFICATION
      if (
        process.env.TELEGRAM_BOT_TOKEN &&
        process.env.TELEGRAM_CHAT_ID
      ) {

        try {

          let subtotal = 0;

          const itemsList = order.items
            .map((i: any) => {

              const variant =
                i.variantName &&
                i.variantName !== "Standard"
                  ? ` (${i.variantName})`
                  : "";

              const itemTotal =
                i.price * i.quantity;

              subtotal += itemTotal;

              return `
🏷 ${i.name.toUpperCase()}${variant}
Qty: ${i.quantity}
Total: ₹${itemTotal}
              `;
            })
            .join("\n\n");

          const addr = order.address;

          const fullAddressText = `
${addr.fullAddress}
${addr.landmark ? `Landmark: ${addr.landmark}` : ""}
${addr.city}, ${addr.state} - ${addr.pincode}
          `;

          const discountAmount =
            subtotal - order.totalAmount;

          const discountLine =
            discountAmount > 0.1
              ? `Discount Applied: -₹${discountAmount.toFixed(2)}`
              : "";

          const message = `
🛍 ORDER RECEIVED

📦 Items:
${itemsList}

${discountLine}

🆔 Order ID:
${order.id}

👤 Customer:
${customerName}

📧 Email:
${order.customerInfo.email}

💰 Amount:
₹${order.totalAmount}

💳 Payment:
${order.paymentType}
(${order.paymentStatus})

🏠 Address:
${fullAddressText}

📞 Phone:
${order.customerInfo.phone}
          `.trim();

          await axios.post(
            `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              chat_id: process.env.TELEGRAM_CHAT_ID,
              text: message
            }
          );

          console.log(
            "Telegram order notification sent"
          );

        } catch (teleErr: any) {

          console.error(
            "Telegram API Error:",
            teleErr.response?.data || teleErr.message
          );

        }
      }

      res.json({ success: true });

    } catch (error: any) {

      console.error(
        "Notification handler failed:",
        error
      );

      res.status(500).json({
        error: "Notification processing failed"
      });

    }
  });

  // ---------------------------------------------------
  // TEST TELEGRAM ROUTE
  // ---------------------------------------------------

  app.get("/api/test-telegram", async (req, res) => {

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {

      return res.status(400).json({
        error: "Missing credentials",
        tokenSet: !!token,
        chatIdSet: !!chatId
      });

    }

    try {

      await axios.post(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          chat_id: chatId,
          text:
            "✅ KarmaGully Bot Connected!\nTelegram integration working."
        }
      );

      res.json({
        success: true,
        message: "Test message sent!"
      });

    } catch (err: any) {

      res.status(500).json({
        success: false,
        error: err.response?.data || err.message
      });

    }
  });

  // ---------------------------------------------------
  // SUPPORT ADMIN NOTIFICATION
  // ---------------------------------------------------

  app.post("/api/notify-admin", async (req, res) => {

    try {

      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;

      if (!token || !chatId) {

        return res.status(400).json({
          error: "Telegram credentials missing"
        });

      }

      const {
        type,
        ticketId,
        username,
        category,
        message,
        text,
        linkedOrderId
      } = req.body;

      let telegramMessage = "";

      if (type === "new_ticket") {

        telegramMessage = `
🎫 NEW SUPPORT TICKET

🆔 Ticket:
${ticketId}

👤 User:
${username}

📂 Category:
${category}

📦 Order:
${linkedOrderId || "N/A"}

💬 Message:
${message}
        `;
      }

      if (type === "new_message") {

        telegramMessage = `
💬 NEW SUPPORT MESSAGE

🆔 Ticket:
${ticketId}

👤 User:
${username}

📝 Message:
${text}
        `;
      }

      await axios.post(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          chat_id: chatId,
          text: telegramMessage
        }
      );

      res.json({
        success: true
      });

    } catch (err: any) {

      console.error(
        "Notify admin failed:",
        err.message
      );

      res.status(500).json({
        success: false,
        error: err.message
      });

    }
  });

  // ---------------------------------------------------
  // SUPPORT USER TELEGRAM REPLY
  // ---------------------------------------------------

  app.post("/api/notify-user-telegram", async (req, res) => {

    try {

      const token =
        process.env.TELEGRAM_BOT_TOKEN;

      if (!token) {

        return res.status(400).json({
          error: "Telegram token missing"
        });

      }

      const { chatId, text } = req.body;

      await axios.post(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          chat_id: chatId,
          text,
          parse_mode: "HTML"
        }
      );

      res.json({
        success: true
      });

    } catch (err: any) {

      console.error(
        "Notify user failed:",
        err.message
      );

      res.status(500).json({
        success: false,
        error: err.message
      });

    }
  });

  // ---------------------------------------------------
  // RAZORPAY CREATE ORDER
  // ---------------------------------------------------

  app.post("/api/razorpay/order", async (req, res) => {

    if (!razorpay) {

      console.error(
        "Razorpay keys missing"
      );

      return res.status(500).json({
        error:
          "Razorpay keys not configured"
      });

    }

    const {
      amount,
      currency = "INR",
      receipt
    } = req.body;

    try {

      const order =
        await razorpay.orders.create({
          amount:
            Math.round(Number(amount) * 100),
          currency,
          receipt,
        });

      res.json(order);

    } catch (error: any) {

      console.error(
        "Razorpay order creation failed:",
        error
      );

      res.status(500).json({
        error:
          error.message ||
          "Failed to create Razorpay order"
      });

    }
  });

  // ---------------------------------------------------
  // RAZORPAY VERIFY
  // ---------------------------------------------------

  app.post("/api/razorpay/verify", async (req, res) => {

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!razorpayKeySecret) {

      return res.status(500).json({
        error:
          "Razorpay secret not configured"
      });

    }

    const body =
      razorpay_order_id +
      "|" +
      razorpay_payment_id;

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          razorpayKeySecret
        )
        .update(body.toString())
        .digest("hex");

    if (
      expectedSignature ===
      razorpay_signature
    ) {

      res.json({
        status: "success"
      });

    } else {

      res.status(400).json({
        status: "failure"
      });

    }
  });

  // ---------------------------------------------------
  // VITE / STATIC FILES
  // ---------------------------------------------------

  if (process.env.NODE_ENV !== "production") {

    const vite = await createViteServer({
      server: {
        middlewareMode: true
      },
      appType: "spa",
    });

    app.use(vite.middlewares);

  } else {

    const distPath =
      path.join(process.cwd(), "dist");

    app.use(express.static(distPath));

    app.get("*", (req, res) => {
      res.sendFile(
        path.join(distPath, "index.html")
      );
    });
  }

  // ---------------------------------------------------
  // START SERVER
  // ---------------------------------------------------

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Server running on http://localhost:${PORT}`
    );
  });
}

startServer();
