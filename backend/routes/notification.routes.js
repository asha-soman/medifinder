// backend/routes/notification.routes.js
const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const Notification = require("../models/notification.model");

// ✅ Get notifications for the logged-in user
router.get("/", authenticate, async (req, res) => {
  try {
    // NORMALIZE the user id from common JWT payload shapes
    const u = req.user || {};
    const userId =
      u._id ||      // e.g. {_id:"..."}
      u.id ||       // e.g. {id:"..."}
      u.userId ||   // e.g. {userId:"..."}
      u.sub ||      // e.g. {sub:"..."}
      (u.user && (u.user._id || u.user.id || u.user.userId)); // e.g. {user:{_id:"..."}}

    if (!userId) {
      return res.status(401).json({
        error: "User not authenticated",
        // uncomment next line once to see the payload shape:
        // debugPayload: u
      });
    }

    const list = await Notification.find({ recipient: String(userId) })
      .sort({ createdAt: -1 })
      .lean();

    res.json(list);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
