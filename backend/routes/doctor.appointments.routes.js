// const express = require('express');
// const router = express.Router();
// const { authenticate, requireRole } = require('../middleware/auth.middleware');
// const Appointment = require('../models/appointment.model');
// const UserModel = require('../models/user.model');

// // Helper: build UTC day range
// function dayRangeFromUTC(dateIso) {
//     const d = new Date(dateIso);
//     const start = new Date(d); start.setUTCHours(0, 0, 0, 0);
//     const end = new Date(d); end.setUTCHours(23, 59, 59, 999);
//     return { start, end };
// }

// /**
//  * GET /api/doctor/appointments?date=YYYY-MM-DD
//  * Returns doctor’s appointments for the given day
//  */
// router.get('/appointments', authenticate, requireRole('doctor'), async (req, res) => {
//     try {
//         const doctorUserId = req.user.sub;
//         const { date } = req.query;
//         if (!date) return res.status(400).json({ error: "Missing date query" });

//         const { start, end } = dayRangeFromUTC(date);

//         const rows = await Appointment.find({
//             doctorId: doctorUserId,
//             start: { $gte: start, $lte: end }
//         })
//             .populate('patientId', 'name email')
//             .sort({ start: 1 })
//             .lean();

//         return res.json(rows.map(r => ({
//             id: r._id,
//             patient: r.patientId,
//             start: r.start,
//             end: r.end,
//             reason: r.reason,
//             status: r.status,
//         })));
//     } catch (e) {
//         return res.status(500).json({ error: e.message });
//     }
// });

// /**
//  * PATCH /api/doctor/appointments/:id/status
//  * Body: { status: "BOOKED" | "CANCELLED" | "COMPLETED" }
//  */
// router.patch('/appointments/:id/status', authenticate, requireRole('doctor'), async (req, res) => {
//     try {
//         const { status } = req.body;
//         if (!['BOOKED', 'CANCELLED', 'COMPLETED'].includes(status)) {
//             return res.status(400).json({ error: 'Invalid status' });
//         }

//         const appt = await Appointment.findOne({ _id: req.params.id, doctorId: req.user.sub });
//         if (!appt) return res.status(404).json({ error: 'Not found' });

//         appt.status = status;
//         await appt.save();

//         return res.json({ id: appt._id, status: appt.status });
//     } catch (e) {
//         return res.status(500).json({ error: e.message });
//     }
// });

// module.exports = router;
const express = require('express');
const router = express.Router();

const { authenticate, requireRole } = require('../middleware/auth.middleware');
const Appointment = require('../models/appointment.model');

// Utility: build a UTC day range from a "YYYY-MM-DD" string
function dayRangeFromUTC(yyyy_mm_dd) {
    if (!yyyy_mm_dd) return null;
    // "YYYY-MM-DD" is parsed as UTC by Date constructor
    const d = new Date(yyyy_mm_dd);
    if (isNaN(d)) return null;
    const start = new Date(d); start.setUTCHours(0, 0, 0, 0);
    const end = new Date(d); end.setUTCHours(23, 59, 59, 999);
    return { start, end };
}

/**
 * GET /api/doctor/appointments?date=YYYY-MM-DD
 * Returns the logged-in doctor’s appointments for a given day.
 */
router.get('/appointments', authenticate, requireRole('doctor'), async (req, res) => {
    try {
        const doctorUserId = req.user.sub; // doctor user id from JWT
        const { date } = req.query;

        const range = dayRangeFromUTC(date);
        if (!range) return res.status(400).json({ error: 'Invalid or missing date (YYYY-MM-DD)' });

        const rows = await Appointment.find({
            doctorUserId,
            start: { $gte: range.start, $lte: range.end },
        })
            .populate('patientUserId', 'name email')
            .sort({ start: 1 })
            .lean();

        // shape for UI
        const out = rows.map(r => ({
            id: String(r._id),
            patient: r.patientUserId ? {
                id: String(r.patientUserId._id),
                name: r.patientUserId.name,
                email: r.patientUserId.email
            } : null,
            start: r.start,
            end: r.end,
            reason: r.reason || '',
            status: r.status
        }));

        return res.json(out);
    } catch (e) {
        console.error('GET /api/doctor/appointments error:', e);
        return res.status(500).json({ error: 'Failed to fetch appointments' });
    }
});

/**
 * PATCH /api/doctor/appointments/:id/status
 * Body: { status: "BOOKED" | "CANCELLED" | "COMPLETED" }
 * Updates the appointment status (only for appointments owned by this doctor).
 */
router.patch('/appointments/:id/status', authenticate, requireRole('doctor'), async (req, res) => {
    try {
        const doctorUserId = req.user.sub;
        const { id } = req.params;
        const { status } = req.body;

        if (!['BOOKED', 'CANCELLED', 'COMPLETED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const appt = await Appointment.findOne({ _id: id, doctorUserId });
        if (!appt) return res.status(404).json({ error: 'Appointment not found' });

        appt.status = status;
        await appt.save();

        return res.json({ id: String(appt._id), status: appt.status });
    } catch (e) {
        console.error('PATCH /api/doctor/appointments/:id/status error:', e);
        return res.status(500).json({ error: 'Failed to update appointment status' });
    }
});

module.exports = router;

