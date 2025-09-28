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

const { appointmentObserver } = require('../shared/observers/appointments.observer');

// TEMP debug logs only — AFTER the require - FIX LATER PLEASE
console.log('authenticate:', typeof authenticate);
console.log('requireRole:', typeof requireRole);
console.log('searchDoctorsFacade:', typeof searchDoctorsFacade);

const router = express.Router();

/** Search */
router.get('/search', authenticate, async (req, res) => {
  // debug: ensure params arrive as expected
  // console.log('[search] incoming query:', req.query);
  return searchDoctorsFacade(req, res);
});

/** Book Appointment */
router.post('/book', authenticate, requireRole('patient'), async (req, res) => {
  try {
    const head = new Validator();
    head.setNext(new StartRequiredValidator())
        .setNext(new NoPastStartValidator());

    await head.handle({ body: req.body, user: req.user });

    const out = await bookAppointmentFacade(req, res);

    // starts AFTER controller succeeded
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

/** Update Amppointment */
router.patch('/appointments/:id', authenticate, requireRole('patient'), async (req, res) => {
  try {
    const head = new Validator();
    head.setNext(new StartRequiredValidator())
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
router.patch('/appointments/:id/cancel', authenticate, requireRole('patient'), async (req, res) => {
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

/** my appointments */
router.get('/my', authenticate, requireRole('patient'), (req, res) =>
  getMyAppointmentsFacade(req, res)
);

router.get('/specialties', async (req, res) => {
  try {
    const Doctor = require('../models/doctor.model');
    const specialties = await Doctor.distinct('specialty', { specialty: { $ne: null } });
    const cleaned = specialties
      .map(s => (typeof s === 'string' ? s.trim() : s))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    res.json(cleaned);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;