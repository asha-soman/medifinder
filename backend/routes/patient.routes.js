const express = require("express");
const { authenticate, requireRole } = require("../middleware/auth.middleware");
const { getPatientDashboard } = require("../shared/facades/dashboard.facade");

const router = express.Router();

// Patient dashboard (Facade + Proxy/Guard)
router.get("/dashboard", authenticate, requireRole("patient"), async (req, res) => {
  try {
    const data = await getPatientDashboard(req.user.sub);
    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to load patient dashboard" });
  }
});

module.exports = router;
