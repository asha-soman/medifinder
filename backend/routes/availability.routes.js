const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const AvailabilityService = require('../services/availability.service');
const AppointmentService = require('../services/appointments.service'); // not used here, but proxy signature allows both
const DoctorAccessProxy = require('../shared/proxies/doctor.proxy');

const router = express.Router();
const proxy = new DoctorAccessProxy(AvailabilityService, AppointmentService);

// GET /api/doctor/availability
router.get('/availability', authenticate, requireRole('doctor'), async (req, res) => {
    try {
        const items = await proxy.listAvailability(req);
        res.json(items);
    } catch (e) {
        res.status(e.status || 400).json({ error: e.message });
    }
});

// POST /api/doctor/availability
router.post('/availability', authenticate, requireRole('doctor'), async (req, res) => {
    try {
        const { date, startTime, endTime, isBlocked } = req.body;
        const created = await proxy.addAvailability(req, { date, startTime, endTime, isBlocked });
        res.status(201).json(created);
    } catch (e) {
        res.status(e.code === 11000 ? 409 : (e.status || 400)).json({ error: e.message });
    }
});

// PATCH /api/doctor/availability/:id
router.patch('/availability/:id', authenticate, requireRole('doctor'), async (req, res) => {
    try {
        const updated = await proxy.updateAvailability(req, req.params.id, req.body);
        res.json(updated);
    } catch (e) {
        res.status(e.status || 400).json({ error: e.message });
    }
});

// DELETE /api/doctor/availability/:id
router.delete('/availability/:id', authenticate, requireRole('doctor'), async (req, res) => {
    try {
        await proxy.removeAvailability(req, req.params.id);
        res.status(204).end();
    } catch (e) {
        res.status(e.status || 400).json({ error: e.message });
    }
});

module.exports = router;
