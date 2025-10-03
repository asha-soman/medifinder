const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const Appointment = require('../models/appointment.model');
const MedicalRecord = require('../models/medicalRecord.model');

async function enforceDoctorOwnsAppointment(doctorUserId, appointmentId) {
    const appt = await Appointment.findById(appointmentId).lean();
    if (!appt) throw new Error('Appointment not found');
    if (String(appt.doctorUserId) !== String(doctorUserId)) {
        const err = new Error('Forbidden');
        err.status = 403;
        throw err;
    }
    return appt;
}

/**
 * GET /api/doctor/records/by-appointment/:appointmentId
 */
router.get('/records/by-appointment/:appointmentId', authenticate, requireRole('doctor'), async (req, res) => {
    try {
        await enforceDoctorOwnsAppointment(req.user.sub, req.params.appointmentId);
        const rec = await MedicalRecord.findOne({ appointmentId: req.params.appointmentId }).lean();
        if (!rec) return res.status(404).json({ error: 'No record yet' });
        return res.json(rec);
    } catch (e) {
        return res.status(e.status || 400).json({ error: e.message });
    }
});

/**
 * POST /api/doctor/records
 */
router.post('/records', authenticate, requireRole('doctor'), async (req, res) => {
    try {
        const { appointmentId, medicalSummary, prescriptionUrl } = req.body || {};
        if (!appointmentId) return res.status(400).json({ error: 'appointmentId is required' });

        const appt = await enforceDoctorOwnsAppointment(req.user.sub, appointmentId);

        const update = {
            doctorUserId: req.user.sub,
            patientUserId: appt.patientUserId,
            medicalSummary: medicalSummary || '',
            prescriptionUrl: prescriptionUrl || '',
        };

        const rec = await MedicalRecord.findOneAndUpdate(
            { appointmentId },
            update,
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json(rec);
    } catch (e) {
        return res.status(e.status || 400).json({ error: e.message });
    }
});

module.exports = router;
