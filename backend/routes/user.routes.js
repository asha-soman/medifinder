// backend/routes/user.routes.js
const express = require("express");
const { authenticate } = require("../middleware/auth.middleware"); 
// ^ I think in your project it’s called "authenticate". Check your middleware folder.

const router = express.Router();

// GET /api/users/me
router.get("/me", authenticate, async (req, res) => {
  try {
    res.json(req.user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
