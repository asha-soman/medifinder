// backend/controllers/appointments.controller.js
const Appointment  = require('../models/appointment.model');
const Doctor       = require('../models/doctor.model');
const Availability = require('../models/availability.model');
const { findSlots } = require('../services/slots.service');

// NEW: use the central event bus to create notifications with the correct User _id
const bus = require("../shared/utils/event.Bus"); // NEW

// -----------------------------------------------------------------------------
// Search available doctors/slots
// -----------------------------------------------------------------------------
const searchDoctors = async (req, res) => {
  try {
    const { date, specialty, name, page = 1, limit = 5 } = req.query;
    const result = await findSlots({
      date,
      specialty,
      name,
      page: Number(page) || 1,
      limit: Number(limit) || 5,
    });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// -----------------------------------------------------------------------------
// Book an appointment
// -----------------------------------------------------------------------------
const bookAppointment = async (req, res) => {
  try {
    const { patientId, doctorId, start, reason } = req.body;
    if (!patientId || !doctorId || !start) {
      return res.status(400).json({ error: 'patientId, doctorId, and start are required' });
    }

    const doc = await Doctor.findById(doctorId).lean();
    if (!doc) return res.status(404).json({ error: 'Doctor not found' });

    const startDate = new Date(start);
    const endDate   = new Date(startDate.getTime() + 60 * 60 * 1000); // 60 mins

    // time must be inside an available (not blocked) window
    const avail = await Availability.findOne({
      doctorId,
      isBlocked: false,
      start: { $lte: startDate },
      end:   { $gt:  startDate }
    }).lean();
    if (!avail) return res.status(409).json({ error: 'Selected time not available' });

    // prevent overlaps (doctor)
    const doctorOverlap = await Appointment.findOne({
      doctorId,
      status: 'BOOKED',
      $or: [
        { start: { $lt: endDate, $gte: startDate } },
        { end:   { $gt: startDate, $lte: endDate } },
        { start: { $lte: startDate }, end: { $gte: endDate } }
      ]
    }).lean();
    if (doctorOverlap) {
      return res.status(409).json({ error: 'Doctor already booked for that time' });
    }

    // prevent overlaps (patient)
    const patientOverlap = await Appointment.findOne({
      patientId,
      status: 'BOOKED',
      $or: [
        { start: { $lt: endDate, $gte: startDate } },
        { end:   { $gt: startDate, $lte: endDate } },
        { start: { $lte: startDate }, end: { $gte: endDate } }
      ]
    }).lean();
    if (patientOverlap) {
      return res.status(409).json({ error: 'You already have an appointment overlapping that time.' });
    }

    // create appointment
    const appt = await Appointment.create({
      patientId,
      doctorId,
      doctorName: doc.doctorName,
      specialty:  doc.specialty,
      start: startDate,
      end:   endDate,
      reason,
      status: 'BOOKED'
    });

    // CHANGED: do NOT write Notification here.
    // Let the event bus create notifications using User _ids.
    bus.emit("appointment.booked", { appointment: appt.toObject() }); // NEW

    res.status(201).json({ _id: appt._id, status: appt.status });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// -----------------------------------------------------------------------------
// Get my upcoming appointments (BOOKED & in the future)
// -----------------------------------------------------------------------------
const getMyAppointments = async (req, res) => {
  try {
    const { patientId } = req.query;
    if (!patientId) return res.status(400).json({ error: 'patientId is required' });

    const now = new Date();
    const list = await Appointment.find({
      patientId,
      status: 'BOOKED',
      end: { $gte: now }
    })
      .sort({ start: 1 })
      .populate('doctorId', 'doctorName specialty email phone')
      .lean();

    res.json(list.map(a => ({
      _id: a._id,
      start: a.start,
      end:   a.end,
      status: a.status,
      doctor: a.doctorId ? {
        _id: a.doctorId._id,
        doctorName: a.doctorId.doctorName,
        specialty:  a.doctorId.specialty,
        email:      a.doctorId.email,
        phone:      a.doctorId.phone,
      } : {
        doctorName: a.doctorName,
        specialty:  a.specialty
      }
    })));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// -----------------------------------------------------------------------------
// Cancel an appointment
// -----------------------------------------------------------------------------
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const appt = await Appointment.findById(id);

    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    if (appt.status === 'CANCELLED') {
      return res.json({ _id: appt._id, status: appt.status });
    }

    appt.status = 'CANCELLED';
    await appt.save();

    // CHANGED: do NOT write Notification here.
    // Let the event bus create notifications using User _ids.
    bus.emit("appointment.canceled", { appointment: appt.toObject() }); // NEW

    return res.json({ _id: appt._id, status: appt.status });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};

// -----------------------------------------------------------------------------
// Reschedule/update an appointment time (kept as-is, no notification here)
// -----------------------------------------------------------------------------
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { start, reason } = req.body;

    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    if (appt.status !== 'BOOKED') {
      return res.status(409).json({ error: 'Only BOOKED appointments can be edited' });
    }
    if (!start) return res.status(400).json({ error: 'start (ISO) is required' });

    const startDate = new Date(start);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // fixed 60 mins
    const doctorId = appt.doctorId;

    // inside available, unblocked window
    const avail = await Availability.findOne({
      doctorId,
      isBlocked: false,
      start: { $lte: startDate },
      end: { $gt: startDate },
    }).lean();
    if (!avail) return res.status(409).json({ error: 'Selected time not available' });

    // no overlap for doctor (excluding current)
    const overlappingDoctor = await Appointment.findOne({
      _id: { $ne: appt._id },
      doctorId,
      status: 'BOOKED',
      $or: [
        { start: { $lt: endDate, $gte: startDate } },
        { end: { $gt: startDate, $lte: endDate } },
        { start: { $lte: startDate }, end: { $gte: endDate } },
      ],
    }).lean();
    if (overlappingDoctor) {
      return res.status(409).json({ error: 'Doctor already booked for that time' });
    }

    // no overlap for patient (excluding current)
    const overlappingPatient = await Appointment.findOne({
      _id: { $ne: appt._id },
      patientId: appt.patientId,
      status: 'BOOKED',
      $or: [
        { start: { $lt: endDate, $gte: startDate } },
        { end: { $gt: startDate, $lte: endDate } },
        { start: { $lte: startDate }, end: { $gte: endDate } },
      ],
    }).lean();
    if (overlappingPatient) {
      return res.status(409).json({ error: 'You already have an appointment overlapping that time.' });
    }

    appt.start = startDate;
    appt.end = endDate;
    if (reason) appt.reason = reason;
    await appt.save();

    // (Optional) emit a rescheduled event if you want notifications for it later
    // bus.emit("appointment.rescheduled", { appointment: appt.toObject() }); // OPTIONAL

    return res.json({
      _id: appt._id,
      status: appt.status,
      start: appt.start,
      end: appt.end,
    });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};

module.exports = {
  searchDoctors,
  bookAppointment,
  getMyAppointments,
  cancelAppointment,
  updateAppointment,
};
