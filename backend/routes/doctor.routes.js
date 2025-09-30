// const express = require("express");
// const { authenticate, requireRole } = require("../middleware/auth.middleware");
// const { getDoctorDashboard } = require("../shared/facades/dashboard.facade");

// const router = express.Router();

// // Doctor dashboard (Facade + Proxy/Guard)
// router.get("/dashboard", authenticate, requireRole("doctor"), async (req, res) => {
//   try {
//     const data = await getDoctorDashboard(req.user.sub);
//     res.json(data);
//   } catch {
//     res.status(500).json({ error: "Failed to load doctor dashboard" });
//   }
// });

// module.exports = router;
const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const Doctor = require('../models/doctor.model');
const AppointmentService = require('../services/appointments.service');
const MedicalRecordService = require('../services/records.service');
const DoctorAccessProxy = require('../shared/proxies/doctor.proxy');

const StrategyContext = require('../shared/strategies/appointments.strategy.context');
const ByTimeStrategy = require('../shared/strategies/appointments.by-time.strategies');
const ByStatusStrategy = require('../shared/strategies/appointments.by-status.strategies');

const AppointmentStateContext = require('../shared/state/appointments.appointment.state');

const router = express.Router();
const proxy = new DoctorAccessProxy(null, AppointmentService);
const strategies = new StrategyContext([new ByTimeStrategy(), new ByStatusStrategy()]);

/** GET /api/doctor/appointments?date=yyyy-mm-dd&view=byTime|byStatus */
router.get('/appointments', authenticate, requireRole('doctor'), async (req, res) => {
  try {
    const { date, view = 'byTime' } = req.query;
    if (!date) return res.status(400).json({ error: 'date is required (yyyy-mm-dd)' });

    const doctor = await Doctor.findOne({ userId: req.user.sub }) || await Doctor.findOne({ user: req.user.sub });
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const items = await AppointmentService.listForDoctorByDay(doctor._id, dayStart, dayEnd);
    const strategy = strategies.use(view);
    const shaped = strategy.apply(items);
    res.json(shaped);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

/** PATCH /api/doctor/appointments/:id/status  body: { action: 'accept'|'reschedule'|'cancel'|'complete' } */
router.patch('/appointments/:id/status', authenticate, requireRole('doctor'), async (req, res) => {
  try {
    const { action } = req.body;
    if (!action) return res.status(400).json({ error: 'action is required' });

    const appt = await AppointmentService.findById(req.params.id);
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    // PROXY: ensure this doctor owns the appointment
    await proxy.ensureOwnsAppointment(req, appt);

    // STATE: enforce valid transitions
    const ctx = new AppointmentStateContext(appt.status, (nextStatus) =>
      AppointmentService.setStatus(appt._id, nextStatus)
    );
    if (typeof ctx[action] !== 'function') {
      return res.status(400).json({ error: 'Unknown action' });
    }

    const updated = await ctx[action](); // accept/reschedule/cancel/complete
    res.json(updated);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

/** POST /api/doctor/encounters  body: { appointmentId, medicalSummary, prescription } */
router.post('/records', authenticate, requireRole('doctor'), async (req, res) => {
  try {
    const { appointmentId, medicalSummary, prescription } = req.body;
    if (!appointmentId) return res.status(400).json({ error: 'appointmentId is required' });

    const appt = await AppointmentService.findById(appointmentId);
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    // PROXY: ensure this doctor owns the appointment
    await proxy.ensureOwnsAppointment(req, appt);

    // (Optional) Require completed before saving encounter, if that's your rule:
    // if (appt.status !== 'completed') return res.status(400).json({ error: 'Mark appointment completed first' });

    const saved = await MedicalRecordService.upsertByAppointment(appt, { medicalSummary, prescription });
    res.status(201).json(saved);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

module.exports = router;




