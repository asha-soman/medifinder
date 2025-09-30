class StrategyContext {
    constructor(strategies) {
        this.map = new Map(strategies.map(s => [s.name(), s]));
    }
    use(name) {
        return this.map.get(name) || this.map.get('byTime');
    }
}
module.exports = StrategyContext;
