const Appointment   = require('../models/appointment.model');
const Availability  = require('../models/availability.model');
const { findSlots } = require('../services/slots.service');

// note: replaced this with Asha's updated models from the dummy models i built
const User           = require('../models/user.model');
const DoctorProfile  = require('../models/doctorProfile.model');
const bus = require("../shared/utils/event.Bus"); //was added by Amanda

//search doctors
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

//Book appointment
const bookAppointment = async (req, res) => {
  try {
    const { patientId, doctorId, start, reason } = req.body;
    if (!patientId || !doctorId || !start) {
      return res.status(400).json({ error: 'patientId, doctorId, and start are required' });
    }

    // ensure both are valid users with correct roles
    const [patUser, docUser] = await Promise.all([
      User.findById(patientId).select('_id role').lean(),
      User.findById(doctorId).select('_id role').lean(),
    ]);
    if (!patUser || patUser.role !== 'PATIENT') {
      return res.status(404).json({ error: 'Patient not found' });
    }
    if (!docUser || docUser.role !== 'DOCTOR') {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const startDate = new Date(start);
    const endDate   = new Date(startDate.getTime() + 60 * 60 * 1000); // 60 mins

    // must be inside an available window
    const avail = await Availability.findOne({
      doctorId,
      isBlocked: false,
      start: { $lte: startDate },
      end:   { $gt:  startDate }
    }).lean();
    if (!avail) return res.status(409).json({ error: 'Selected time not available' });

    // Prevent overlaps, doctor
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

    // Prevent overlaps, patient
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

    // Create appointment, will pull other details from other model
    // soooo. details will change if profile is updated. like docname, specialization
    const appt = await Appointment.create({
      patientId,
      doctorId,
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
    // this is just dafety net foooor dublicatiooooon :)
    if (e && (e.code === 11000 || (e.name === 'MongoServerError' && e.code === 11000))) {
      return res.status(409).json({ error: 'Doctor already booked for that time' });
    }
    return res.status(400).json({ error: e.message });
  }
};

// Get appointments list
const getMyAppointments = async (req, res) => {
  try {
    const { patientId } = req.query;
    if (!patientId) return res.status(400).json({ error: 'patientId is required' });

    // ensure patient exists (this will pull from User)
    const patUser = await User.findById(patientId).select('_id role').lean();
    if (!patUser || patUser.role !== 'PATIENT') {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const now = new Date();
    const list = await Appointment.find({
      patientId,
      status: 'BOOKED',
      end: { $gte: now }
    })
      .sort({ start: 1 })
      .populate('doctorId', 'name email role') // doctor is a User
      .lean();

    // load DoctorProfile for specialization/contact
    const doctorUserIds = list.map(a => a.doctorId?._id).filter(Boolean);
    const profiles = await DoctorProfile.find({ userId: { $in: doctorUserIds } })
      .select('userId specialization contact')
      .lean();
    const profByUser = new Map(profiles.map(p => [String(p.userId), p]));

    res.json(list.map(a => {
      const doc = a.doctorId;
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

/* Cancel Appointment */
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

// Update Appointment (Reschedule/Edit)
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
    const endDate   = new Date(startDate.getTime() + 60 * 60 * 1000); // 60 mins
    const doctorId  = appt.doctorId;

    // Must be inside doctors availability
    const avail = await Availability.findOne({
      doctorId,
      isBlocked: false,
      start: { $lte: startDate },
      end:   { $gt:  startDate },
    }).lean();
    if (!avail) return res.status(409).json({ error: 'Selected time not available' });

    // doctor overlap seeelf
    const overlappingDoctor = await Appointment.findOne({
      _id: { $ne: appt._id },
      doctorId,
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

    // patient overlap, excluding me, myself, and i
    const overlappingPatient = await Appointment.findOne({
      _id: { $ne: appt._id },
      patientId: appt.patientId,
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

    // Save updates
    appt.start = startDate;
    appt.end   = endDate;
    if (reason) appt.reason = reason;
    await appt.save();

    // (Optional) emit a rescheduled event if you want notifications for it later
    // bus.emit("appointment.rescheduled", { appointment: appt.toObject() }); // OPTIONAL

    return res.json({
      _id: appt._id,
      status: appt.status,
      start: appt.start,
      end:   appt.end,
    });
  } catch (e) {
    // this is just dafety net foooor dublicatiooooon :)
    if (e && (e.code === 11000 || (e.name === 'MongoServerError' && e.code === 11000))) {
      return res.status(409).json({ error: 'Doctor already booked for that time' });
    }
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
