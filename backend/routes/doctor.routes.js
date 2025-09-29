const router = require("express").Router();
const { authenticate, requireRole } = require("../middleware/auth.middleware");
const { DoctorProfileService } = require("../services/doctorProfile.service");

router.get(
  "/profile",
  authenticate, requireRole("doctor"),
  async (req, res, next) => {
    try {
      const profile = await DoctorProfileService.getByUserId(req.user.sub);
      res.json(profile);
    } catch (e) { next(e); }
  }
);

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
    } catch (e) { next(e); }
  }
);

module.exports = router;
