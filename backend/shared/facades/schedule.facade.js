const Availability = require('../../models/availability.model');

module.exports = class ScheduleFacade {
    static async listAvailability({ doctorUserId, dayStart, dayEnd }) {
        const rows = await Availability
            .find({ doctorUserId, startTime: { $gte: dayStart, $lte: dayEnd } })
            .sort({ startTime: 1 })
            .lean();

        return {
            date: dayStart.toISOString(),
            blocks: rows.map(r => ({
                id: String(r._id),
                startTime: r.startTime,
                endTime: r.endTime,
                isBlocked: !!r.isBlocked,
            })),
            totals: { windows: rows.length }
        };
    }
};


