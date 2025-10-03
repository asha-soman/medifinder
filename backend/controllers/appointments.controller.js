// backend/controllers/appointments.controller.js
const Appointment   = require('../models/appointment.model');
const Availability  = require('../models/availability.model');
const { findSlots } = require('../services/slots.service');
const { UserModel: User } = require('../models/user.model');
const DoctorProfile  = require('../models/doctorProfile.model');
const bus = require("../shared/utils/event.Bus"); // (no change)

// ---------------- Search doctors ----------------
const searchDoctors = async (req, res) => {
  try {
    const { date, specialization, name, page = 1, limit = 5 } = req.query;
    const result = await findSlots({
      date,
      specialization,
      name,
      page: Number(page) || 1,
      limit: Number(limit) || 5,
    });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// ---------------- Book appointment ----------------
const bookAppointment = async (req, res) => {
  try {
    const { patientUserId, doctorUserId, start, reason } = req.body;
    if (!patientUserId || !doctorUserId || !start) {
      return res.status(400).json({ error: 'patientUserId, doctorUserId, and start are required' });
    }

    // validate users
    const [patUser, docUser] = await Promise.all([
      User.findById(patientUserId).select('_id role').lean(),
      User.findById(doctorUserId).select('_id role').lean(),
    ]);
    if (!patUser || patUser.role !== 'patient') {
      return res.status(404).json({ error: 'Patient not found' });
    }
    if (!docUser || docUser.role !== 'doctor') {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const startDate = new Date(start);
    const endDate   = new Date(startDate.getTime() + 60 * 60 * 1000);

    // check doctor availability
    const avail = await Availability.findOne({
      doctorUserId,
      isBlocked: false,
      startTime: { $lte: startDate },
      endTime:   { $gt:  startDate }
    }).lean();
    if (!avail) return res.status(409).json({ error: 'Selected time not available' });

    // prevent overlaps
    const doctorOverlap = await Appointment.findOne({
      doctorUserId,
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

    const patientOverlap = await Appointment.findOne({
      patientUserId,
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

    // create
    const appt = await Appointment.create({
      patientUserId,
      doctorUserId,
      start: startDate,
      end:   endDate,
      reason,
      status: 'BOOKED'
    });

    // ✅ CHANGED: trigger notification via event bus (BOOKED)
    bus.emit("appointment.booked", { appointment: appt.toObject() });

    res.status(201).json({ _id: appt._id, status: appt.status });
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ error: 'Doctor already booked for that time' });
    }
    return res.status(400).json({ error: e.message });
  }
};

// ---------------- Get my appointments ----------------
const getMyAppointments = async (req, res) => {
  try {
    const { patientUserId } = req.query;
    if (!patientUserId) return res.status(400).json({ error: 'patientUserId is required' });

    const patUser = await User.findById(patientUserId).select('_id role').lean();
    if (!patUser || patUser.role !== 'patient') {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const now = new Date();
    const list = await Appointment.find({
      patientUserId,
      status: 'BOOKED',
      end: { $gte: now }
    })
      .sort({ start: 1 })
      .populate('doctorUserId', 'name email role')
      .lean();

    const doctorUserIds = list.map(a => a.doctorUserId?._id).filter(Boolean);
    const profiles = await DoctorProfile.find({ userId: { $in: doctorUserIds } })
      .select('userId specialization contact')
      .lean();
    const profByUser = new Map(profiles.map(p => [String(p.userId), p]));

    res.json(list.map(a => {
      const doc = a.doctorUserId;
      const prof = doc ? profByUser.get(String(doc._id)) : null;
      return {
        _id: a._id,
        start: a.start,
        end:   a.end,
        status: a.status,
        doctor: doc ? {
          _id: doc._id,
          doctorName: doc.name || '',
          specialization: prof?.specialization || '',
          email: doc.email || '',
          phone: prof?.contact || ''
        } : {
          doctorName: '',
          specialization: ''
        }
      };
    }));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// ---------------- Cancel appointment ----------------
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

    // ✅ CHANGED: trigger notification via event bus (CANCELLED)
    bus.emit("appointment.canceled", { appointment: appt.toObject() });

    return res.json({ _id: appt._id, status: appt.status });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};

// ---------------- Update appointment (reschedule/edit) ----------------
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

    const oldStart = appt.start; // ✅ ADDED: keep old start for reschedule notification

    const startDate = new Date(start);
    const endDate   = new Date(startDate.getTime() + 60 * 60 * 1000);
    const doctorUserId  = appt.doctorUserId;

    // check doctor availability
    const avail = await Availability.findOne({
      doctorUserId,
      isBlocked: false,
      startTime: { $lte: startDate },
      endTime:   { $gt:  startDate },
    }).lean();
    if (!avail) return res.status(409).json({ error: 'Selected time not available' });

    // overlap checks
    const overlappingDoctor = await Appointment.findOne({
      _id: { $ne: appt._id },
      doctorUserId,
      status: 'BOOKED',
      $or: [
        { start: { $lt: endDate, $gte: startDate } },
        { end:   { $gt: startDate, $lte: endDate } },
        { start: { $lte: startDate }, end: { $gte: endDate } },
      ],
    }).lean();
    if (overlappingDoctor) {
      return res.status(409).json({ error: 'Doctor already booked for that time' });
    }

    const overlappingPatient = await Appointment.findOne({
      _id: { $ne: appt._id },
      patientUserId: appt.patientUserId,
      status: 'BOOKED',
      $or: [
        { start: { $lt: endDate, $gte: startDate } },
        { end:   { $gt: startDate, $lte: endDate } },
        { start: { $lte: startDate }, end: { $gte: endDate } },
      ],
    }).lean();
    if (overlappingPatient) {
      return res.status(409).json({ error: 'You already have an appointment overlapping that time.' });
    }

    appt.start = startDate;
    appt.end   = endDate;
    if (reason) appt.reason = reason;
    await appt.save();

    // ✅ ADDED: emit rescheduled event (notifications for both parties)
    bus.emit("appointment.rescheduled", { appointment: appt.toObject(), oldStart });

    return res.json({
      _id: appt._id,
      status: appt.status,
      start: appt.start,
      end:   appt.end,
    });
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ error: 'Doctor already booked for that time' });
    }
    return res.status(400).json({ error: e.message });
  }
};

// ---------------- Complete appointment ----------------
// ✅ ADDED: lets a doctor mark an appointment as COMPLETED
//          (so it appears in the patient's History immediately)
const completeAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const u = req.user || {};
    const doctorUserId = u._id;

    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    if (String(appt.doctorUserId) !== String(doctorUserId)) {
      return res.status(403).json({ error: 'Only the owning doctor can complete this appointment' });
    }
    if (appt.status !== 'BOOKED') {
      return res.status(409).json({ error: 'Only BOOKED appointments can be completed' });
    }

    appt.status = 'COMPLETED';
    await appt.save();

    // (Optional) If you also want a "COMPLETED" notification:
    // bus.emit("appointment.completed", { appointment: appt.toObject() });

    res.json({ _id: appt._id, status: appt.status });
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
  completeAppointment, // ✅ ADDED
};
