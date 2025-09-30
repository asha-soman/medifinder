const order = { pending: 1, booked: 2, rescheduled: 3, accepted: 4, completed: 5, cancelled: 6 };
class ByStatusStrategy {
    name() { return 'byStatus'; }
    apply(items) {
        return [...items].sort((a, b) => {
            const oa = order[a.status] ?? 99;
            const ob = order[b.status] ?? 99;
            if (oa !== ob) return oa - ob;
            return new Date(a.startTime) - new Date(b.startTime);
        });
    }
}
module.exports = ByStatusStrategy;
