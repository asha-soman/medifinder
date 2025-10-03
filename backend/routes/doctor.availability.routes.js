const express = require('express');
const Availability = require('../models/availability.model');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const ScheduleFacade = require('../shared/facades/schedule.facade');
const { availabilityObserver } = require('../shared/observers/availability.observer');
const {
    Validator,
    RequiredFieldsValidator,
    TimeOrderValidator,
} = require('../shared/validators/availability.validators');

const router = express.Router();

/** Build start/end-of-day from ISO (we’ll use this for startTime range) */
function dayRangeFromUTC(dateIso) {
    const d = new Date(dateIso);
    if (Number.isNaN(d.getTime())) throw new Error('Invalid date');
    const start = new Date(d); start.setUTCHours(0, 0, 0, 0);
    const end = new Date(d); end.setUTCHours(23, 59, 59, 999);
    return { start, end };
}

/** LIST by startTime day range — GET /api/doctor/availability?date=ISO */
router.get('/availability', authenticate, requireRole('doctor'), async (req, res) => {
    try {
        const doctorUserId = req.user.sub;
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: 'date query param is required (ISO)' });

        const { start: dayStart, end: dayEnd } = dayRangeFromUTC(date);


        // facade is called & allowed it use startTime range internally
        if (ScheduleFacade?.listAvailability) {
            const dto = await ScheduleFacade.listAvailability({ doctorUserId, dayStart, dayEnd });
            return res.json(dto);
        }

        // Fallback: raw docs
        const rows = await Availability
            .find({ doctorUserId, startTime: { $gte: dayStart, $lte: dayEnd } })
            .sort({ startTime: 1 })
            .lean();

        return res.json({
            date: dayStart.toISOString(),
            blocks: rows.map(r => ({
                id: String(r._id),
                startTime: r.startTime,
                endTime: r.endTime,
                isBlocked: !!r.isBlocked,
            })),
            totals: { windows: rows.length }
        });
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
});

/** CREATE — POST /api/doctor/availability */
router.post('/availability', authenticate, requireRole('doctor'), async (req, res) => {
    try {
        const head = new Validator();
        head.setNext(new RequiredFieldsValidator()).setNext(new TimeOrderValidator());
        await head.handle({ body: req.body });

        const created = await Availability.create({
            doctorUserId: req.user.sub,
            date: req.body.date,            // UI now sends UTC midnight of the day
            startTime: req.body.startTime,  // ISO instant
            endTime: req.body.endTime,      // ISO instant
            isBlocked: !!req.body.isBlocked,
        });

        availabilityObserver.emit('availability.changed', {
            type: 'added',
            doctorUserId: req.user.sub,
            id: String(created._id),
            date: created.date,
        });

        return res.status(201).json(created);
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
});

/** UPDATE — PATCH /api/doctor/availability/:id */
router.patch('/availability/:id', authenticate, requireRole('doctor'), async (req, res) => {
    try {
        const row = await Availability.findById(req.params.id);
        if (!row) return res.status(404).json({ error: 'Not found' });
        if (String(row.doctorUserId) !== String(req.user.sub)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        if (req.body.startTime || req.body.endTime) {
            const head = new Validator();
            head.setNext(new TimeOrderValidator());
            await head.handle({
                body: {
                    startTime: req.body.startTime ?? row.startTime,
                    endTime: req.body.endTime ?? row.endTime,
                }
            });
        }

        Object.assign(row, {
            date: req.body.date ?? row.date,
            startTime: req.body.startTime ?? row.startTime,
            endTime: req.body.endTime ?? row.endTime,
            isBlocked: typeof req.body.isBlocked === 'boolean' ? req.body.isBlocked : row.isBlocked,
        });

        const updated = await row.save();

        availabilityObserver.emit('availability.changed', {
            type: 'updated',
            doctorUserId: req.user.sub,
            id: String(updated._id),
            date: updated.date,
        });

        return res.json(updated);
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
});

/** DELETE — DELETE /api/doctor/availability/:id */
router.delete('/availability/:id', authenticate, requireRole('doctor'), async (req, res) => {
    try {
        const row = await Availability.findById(req.params.id);
        if (!row) return res.status(404).json({ error: 'Not found' });
        if (String(row.doctorUserId) !== String(req.user.sub)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await row.deleteOne();

        availabilityObserver.emit('availability.changed', {
            type: 'deleted',
            doctorUserId: req.user.sub,
            id: String(row._id),
            date: row.date,
        });

        return res.status(204).end();
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
});

module.exports = router;


