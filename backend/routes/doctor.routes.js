const express = require("express");
const { authenticate, requireRole } = require("../middleware/auth.middleware");
const { getDoctorDashboard } = require("../shared/facades/dashboard.facade");

const router = express.Router();

// Doctor dashboard (Facade + Proxy/Guard)
router.get("/dashboard", authenticate, requireRole("doctor"), async (req, res) => {
  try {
    const data = await getDoctorDashboard(req.user.sub);
    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to load doctor dashboard" });
  }
});

module.exports = router;
