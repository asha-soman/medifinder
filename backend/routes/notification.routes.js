// backend/routes/notification.routes.js
const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const Notification = require("../models/notification.model");

// ✅ Get notifications for the logged-in user
router.get("/", authenticate, async (req, res) => {
  try {
    // Important: use req.user.id (string) instead of req.user._id if that’s how your middleware sets it
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const list = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json(list);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
