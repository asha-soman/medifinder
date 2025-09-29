const express = require("express");
const { authenticate, requireRole } = require("../middleware/auth.middleware");
const { getPatientDashboard } = require("../shared/facades/dashboard.facade");
const { PatientProfileService } = require("../services/patientProfile.service");

const router = express.Router();

router.get("/dashboard", authenticate, requireRole("patient"), async (req, res) => {
  try {
    const data = await getPatientDashboard(req.user.sub);
    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to load patient dashboard" });
  }
});


// GET /api/patient/profile
router.get(
  "/profile",
  authenticate, requireRole("patient"),
  async (req, res, next) => {
    try {
      const profile = await PatientProfileService.getByUserId(req.user.sub);
      res.json(profile);
    } catch (err) { next(err); }
  }
);

// PUT /api/patient/profile
router.put(
  "/profile",
  authenticate, requireRole("patient"),
  async (req, res, next) => {
    try {
      const patch = {
        dateOfBirth: req.body?.dateOfBirth,
        phone: req.body?.phone,
        address: req.body?.address,
        emergencyContact: req.body?.emergencyContact,
      };
      const updated = await PatientProfileService.update(req.user.sub, patch);
      res.json(updated);
    } catch (err) { next(err); }
  }
);

module.exports = router;
