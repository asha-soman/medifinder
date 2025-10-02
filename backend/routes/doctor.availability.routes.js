// const express = require('express');
// const Availability = require('../models/availability.model');
// const { authenticate, requireRole } = require('../middleware/auth.middleware');

// const router = express.Router();

// /** Helper: build start/end of day from an ISO date string */
// function dayRangeFrom(dateIso) {
//     const d = new Date(dateIso);
//     if (Number.isNaN(d.getTime())) throw new Error('Invalid date');
//     const start = new Date(d); start.setHours(0, 0, 0, 0);
//     const end = new Date(d); end.setHours(23, 59, 59, 999);
//     return { start, end };
// }

// /**
//  * GET /api/doctor/availability
//  * Query:
//  *   - ?date=<ISO>  // optional; if present, returns only rows that match that day
//  * Returns array of raw documents for the doctor.
//  */
// router.get('/availability', authenticate, requireRole('doctor'), async (req, res) => {
//     try {
//         const doctorUserId = req.user.sub;
//         const { date } = req.query;

//         let filter = { doctorUserId };
//         if (date) {
//             const { start, end } = dayRangeFrom(date);
//             filter.date = { $gte: start, $lte: end };
//         }

//         const rows = await Availability
//             .find(filter)
//             .sort({ date: 1, startTime: 1 })
//             .lean();

//         res.json(rows);
//     } catch (e) {
//         res.status(400).json({ error: e.message });
//     }
// });

// /**
//  * GET /api/doctor/availability/:id
//  * Ownership enforced (must belong to logged-in doctor)
//  */
// router.get('/availability/:id', authenticate, requireRole('doctor'), async (req, res) => {
//     try {
//         const row = await Availability.findById(req.params.id).lean();
//         if (!row) return res.status(404).json({ error: 'Not found' });
//         if (String(row.doctorUserId) !== String(req.user.sub)) {
//             return res.status(403).json({ error: 'Forbidden' });
//         }
//         res.json(row);
//     } catch (e) {
//         res.status(400).json({ error: e.message });
//     }
// });

// /**
//  * POST /api/doctor/availability
//  * Body: { date: ISO, startTime: ISO, endTime: ISO, isBlocked?: boolean }
//  */
// router.post('/availability', authenticate, requireRole('doctor'), async (req, res) => {
//     try {
//         const { date, startTime, endTime, isBlocked } = req.body;
//         if (!date || !startTime || !endTime) {
//             return res.status(400).json({ error: 'date, startTime, endTime are required' });
//         }

//         const created = await Availability.create({
//             doctorUserId: req.user.sub,
//             date,
//             startTime,
//             endTime,
//             isBlocked: !!isBlocked,
//         });

//         res.status(201).json(created);
//     } catch (e) {
//         res.status(400).json({ error: e.message });
//     }
// });

// /**
//  * PATCH /api/doctor/availability/:id
//  * Body: any of { date, startTime, endTime, isBlocked }
//  * Ownership enforced.
//  */
// router.patch('/availability/:id', authenticate, requireRole('doctor'), async (req, res) => {
//     try {
//         const row = await Availability.findById(req.params.id);
//         if (!row) return res.status(404).json({ error: 'Not found' });
//         if (String(row.doctorUserId) !== String(req.user.sub)) {
//             return res.status(403).json({ error: 'Forbidden' });
//         }

//         // Apply only provided fields
//         if (req.body.date != null) row.date = req.body.date;
//         if (req.body.startTime != null) row.startTime = req.body.startTime;
//         if (req.body.endTime != null) row.endTime = req.body.endTime;
//         if (typeof req.body.isBlocked === 'boolean') row.isBlocked = req.body.isBlocked;

//         const updated = await row.save();
//         res.json(updated);
//     } catch (e) {
//         res.status(400).json({ error: e.message });
//     }
// });

// /**
//  * DELETE /api/doctor/availability/:id
//  * Ownership enforced.
//  */
// router.delete('/availability/:id', authenticate, requireRole('doctor'), async (req, res) => {
//     try {
//         const row = await Availability.findById(req.params.id);
//         if (!row) return res.status(404).json({ error: 'Not found' });
//         if (String(row.doctorUserId) !== String(req.user.sub)) {
//             return res.status(403).json({ error: 'Forbidden' });
//         }

//         await row.deleteOne();
//         res.status(204).end();
//     } catch (e) {
//         res.status(400).json({ error: e.message });
//     }
// });

// module.exports = router;




/* ------------ with design patterns ------------- */
// const express = require('express');
// const Availability = require('../models/availability.model');
// const { authenticate, requireRole } = require('../middleware/auth.middleware');

// // Patterns
// const ScheduleFacade = require('../shared/facades/schedule.facade');
// const { availabilityObserver } = require('../shared/observers/availability.observer');
// const {
//     Validator,
//     RequiredFieldsValidator,
//     TimeOrderValidator,
// } = require('../shared/validators/availability.validators');

// const router = express.Router();

// /** Build start/end-of-day range from ISO date */
// function dayRangeFrom(dateIso) {
//     const d = new Date(dateIso);
//     if (Number.isNaN(d.getTime())) throw new Error('Invalid date');
//     const start = new Date(d); start.setHours(0, 0, 0, 0);
//     const end = new Date(d); end.setHours(23, 59, 59, 999);
//     return { start, end };
// }

// /** LIST (Facade) — GET /api/doctor/availability?date=ISO */
// router.get('/availability', authenticate, requireRole('doctor'), async (req, res) => {
//     try {
//         const doctorUserId = req.user.sub;
//         const { date } = req.query;
//         if (!date) return res.status(400).json({ error: 'date query param is required (ISO)' });

//         const { start: dayStart, end: dayEnd } = dayRangeFrom(date);

//         const dto = await ScheduleFacade.listAvailability({ doctorUserId, dayStart, dayEnd });
//         return res.json(dto);
//     } catch (e) {
//         return res.status(400).json({ error: e.message });
//     }
// });

// /** CREATE (Chain + Observer) — POST /api/doctor/availability */
// router.post('/availability', authenticate, requireRole('doctor'), async (req, res) => {
//     try {
//         const head = new Validator();
//         head.setNext(new RequiredFieldsValidator()).setNext(new TimeOrderValidator());
//         await head.handle({ body: req.body });

//         const created = await Availability.create({
//             doctorUserId: req.user.sub,
//             date: req.body.date,
//             startTime: req.body.startTime,
//             endTime: req.body.endTime,
//             isBlocked: !!req.body.isBlocked,
//         });

//         availabilityObserver.emit('availability.changed', {
//             type: 'added',
//             doctorUserId: req.user.sub,
//             id: String(created._id),
//             date: created.date,
//         });

//         return res.status(201).json(created);
//     } catch (e) {
//         return res.status(400).json({ error: e.message });
//     }
// });

// /** UPDATE (Chain + Observer) — PATCH /api/doctor/availability/:id */
// router.patch('/availability/:id', authenticate, requireRole('doctor'), async (req, res) => {
//     try {
//         const row = await Availability.findById(req.params.id);
//         if (!row) return res.status(404).json({ error: 'Not found' });
//         if (String(row.doctorUserId) !== String(req.user.sub)) {
//             return res.status(403).json({ error: 'Forbidden' });
//         }

//         // If times are provided, validate ordering
//         if (req.body.startTime || req.body.endTime) {
//             const head = new Validator();
//             head.setNext(new TimeOrderValidator());
//             await head.handle({
//                 body: {
//                     startTime: req.body.startTime ?? row.startTime,
//                     endTime: req.body.endTime ?? row.endTime,
//                 }
//             });
//         }

//         Object.assign(row, {
//             date: req.body.date ?? row.date,
//             startTime: req.body.startTime ?? row.startTime,
//             endTime: req.body.endTime ?? row.endTime,
//             isBlocked: typeof req.body.isBlocked === 'boolean' ? req.body.isBlocked : row.isBlocked,
//         });

//         const updated = await row.save();

//         availabilityObserver.emit('availability.changed', {
//             type: 'updated',
//             doctorUserId: req.user.sub,
//             id: String(updated._id),
//             date: updated.date,
//         });

//         return res.json(updated);
//     } catch (e) {
//         return res.status(400).json({ error: e.message });
//     }
// });

// /** DELETE (Observer) — DELETE /api/doctor/availability/:id */
// router.delete('/availability/:id', authenticate, requireRole('doctor'), async (req, res) => {
//     try {
//         const row = await Availability.findById(req.params.id);
//         if (!row) return res.status(404).json({ error: 'Not found' });
//         if (String(row.doctorUserId) !== String(req.user.sub)) {
//             return res.status(403).json({ error: 'Forbidden' });
//         }

//         await row.deleteOne();

//         availabilityObserver.emit('availability.changed', {
//             type: 'deleted',
//             doctorUserId: req.user.sub,
//             id: String(row._id),
//             date: row.date,
//         });

//         return res.status(204).end();
//     } catch (e) {
//         return res.status(400).json({ error: e.message });
//     }
// });

// module.exports = router;

const express = require('express');
const Availability = require('../models/availability.model');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const ScheduleFacade = require('../shared/facades/schedule.facade'); // if you’re using it
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


        // If you use a facade, call it and let it use startTime range internally
        if (ScheduleFacade?.listAvailability) {
            const dto = await ScheduleFacade.listAvailability({ doctorUserId, dayStart, dayEnd });
            return res.json(dto);
        }

        // Fallback: raw docs (if you aren’t using the facade)
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


