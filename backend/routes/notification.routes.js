// backend/routes/notification.routes.js
const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const mongoose = require("mongoose");
const Notification = require("../models/notification.model");

/**
 * Helper: extract a user id from JWT payloads with different shapes.
 */
function getUserIdFromReq(req) {
  const u = req.user || {};
  return (
    u._id ||
    u.id ||
    u.userId ||
    u.sub ||
    (u.user && (u.user._id || u.user.id || u.user.userId)) ||
    null
  );
}

/**
 * GET /api/notifications
 * Optional query:
 *   - read=true|false (filter by read status)
 *   - userId=<ObjectId> (override; otherwise uses req.user)
 *   - limit, skip (pagination)
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const userId = req.query.userId || getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const filter = { recipient: String(userId) };

    if (typeof req.query.read !== "undefined") {
      filter.read = String(req.query.read).toLowerCase() === "true";
    }

    const limit = Math.max(0, parseInt(req.query.limit, 10) || 0);
    const skip = Math.max(0, parseInt(req.query.skip, 10) || 0);

    const list = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json(list);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * POST /api/notifications
 * body: { recipient, message, type, appointment? }
 * type must be: "BOOKED" | "CANCELLED" | "RESCHEDULED"
 */
router.post("/", authenticate, async (req, res) => {
  try {
    let { recipient, message, type, appointment } = req.body;

    // Fallback: if recipient not provided, default to logged-in user
    if (!recipient) {
      recipient = getUserIdFromReq(req);
    }

    if (!recipient || !message || !type) {
      return res
        .status(400)
        .json({ error: "recipient, message and type are required" });
    }

    // Optional: basic validation for ObjectId fields
    if (!mongoose.isValidObjectId(recipient)) {
      return res.status(400).json({ error: "Invalid recipient id" });
    }
    if (appointment && !mongoose.isValidObjectId(appointment)) {
      return res.status(400).json({ error: "Invalid appointment id" });
    }

    // Ensure type is one of the enum values your model expects
    const allowed = ["BOOKED", "CANCELLED", "RESCHEDULED"];
    if (!allowed.includes(type)) {
      return res
        .status(400)
        .json({ error: `type must be one of: ${allowed.join(", ")}` });
    }

    const doc = await Notification.create({
      recipient,
      message,
      type,
      appointment: appointment || null,
    });

    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read
 */
router.patch("/:id/read", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid notification id" });
    }

    const updated = await Notification.findByIdAndUpdate(
      id,
      { $set: { read: true } },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * PATCH /api/notifications/read-all?userId=<id>
 * Marks all notifications for the user as read
 */
router.patch("/read-all", authenticate, async (req, res) => {
  try {
    const userId = req.query.userId || getUserIdFromReq(req);
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    const result = await Notification.updateMany(
      { recipient: userId, read: false },
      { $set: { read: true } }
    );

    // Support both old and new Mongoose result shapes
    const matched = result.matchedCount ?? result.n ?? 0;
    const modified = result.modifiedCount ?? result.nModified ?? 0;

    res.json({ matched, modified });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
