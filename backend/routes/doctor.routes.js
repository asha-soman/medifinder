const express = require("express");
const { authenticate, requireRole } = require("../middleware/auth.middleware");
const { getDoctorDashboard } = require("../shared/facades/dashboard.facade");
const { DoctorProfileService } = require("../services/doctorProfile.service");

const router = express.Router();

router.get("/dashboard", authenticate, requireRole("doctor"), async (req, res) => {
  try {
    const data = await getDoctorDashboard(req.user.sub);
    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to load doctor dashboard" });
  }
});


// GET /api/doctor/profile
router.get(
  "/profile",
  authenticate, requireRole("doctor"),
  async (req, res, next) => {
    try {
      const profile = await DoctorProfileService.getByUserId(req.user.sub);
      res.json(profile);
    } catch (err) { next(err); }
  }
);

// PUT /api/doctor/profile
router.put(
  "/profile",
  authenticate, requireRole("doctor"),
  async (req, res, next) => {
    try {
      const patch = {
        specialization: req.body?.specialization,
        clinicName:     req.body?.clinicName,
        contact:        req.body?.contact,
      };
      const updated = await DoctorProfileService.update(req.user.sub, patch);
      res.json(updated);
    } catch (err) { next(err); }
  }
);

module.exports = router;
