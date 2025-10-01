// backend/controllers/notificationController.js
const Notification = require("../models/notification.model");

const getMyNotifications = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit)
        .populate({ path: "appointment", select: "status createdAt updatedAt" }),
      Notification.countDocuments({ recipient: req.user._id })
    ]);

    res.json({ page, limit, total, items });
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ message: err.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user._id },   // Proxy guard: only owner can modify
      { $set: { read: true } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Notification not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { $set: { read: true } });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getMyNotifications, markAsRead, markAllRead };
