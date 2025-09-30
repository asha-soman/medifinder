const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const {
  searchDoctorsFacade,
  bookAppointmentFacade,
  updateAppointmentFacade,
  cancelAppointmentFacade,
  getMyAppointmentsFacade
} = require('../shared/facades/booking.facade');

const {
  Validator,
  StartRequiredValidator,
  NoPastStartValidator
} = require('../shared/validators/booking.validator.chain');

const { appointmentObserver } = require('../shared/observers/appointments.observer.js');

const router = express.Router();

/** Search doctors & availability */
router.get('/search', authenticate, async (req, res) => {
  return searchDoctorsFacade(req, res);
});

/** Book Appointment */
router.post('/book', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const head = new Validator();
    head
      .setNext(new StartRequiredValidator())
      .setNext(new NoPastStartValidator());

    await head.handle({ body: req.body, user: req.user });

    const out = await bookAppointmentFacade(req, res);

    // event (kept as-is)
    appointmentObserver.emit('appointment.booked', {
      patientId: req.body.patientId,
      doctorId: req.body.doctorId,
      start: req.body.start,
    });

    return out;
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

/** Update Appointment */
router.patch('/appointments/:id', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const head = new Validator();
    head
      .setNext(new StartRequiredValidator())
      .setNext(new NoPastStartValidator());

    await head.handle({ body: req.body, user: req.user });

    const out = await updateAppointmentFacade(req, res);

    appointmentObserver.emit('appointment.updated', {
      appointmentId: req.params.id,
      start: req.body.start,
    });

    return out;
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

/** Cancel Appointment */
router.patch('/appointments/:id/cancel', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const out = await cancelAppointmentFacade(req, res);

    appointmentObserver.emit('appointment.canceled', {
      appointmentId: req.params.id,
    });

    return out;
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

/** My upcoming appointments */
router.get('/my', authenticate, requireRole('PATIENT'), (req, res) =>
  getMyAppointmentsFacade(req, res)
);

router.get('/specialties', async (req, res) => {
  try {
    const DoctorProfile = require('../models/doctorProfile.model');
    const specs = await DoctorProfile.distinct('specialization', { specialization: { $ne: null } });
    const cleaned = specs
      .map(s => (typeof s === 'string' ? s.trim() : s))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    res.json(cleaned);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;