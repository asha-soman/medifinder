class ByTimeStrategy {
    name() { return 'byTime'; }
    apply(items) {
        return [...items].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    }
}
module.exports = ByTimeStrategy;
