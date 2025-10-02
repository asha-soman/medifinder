class Validator {
    setNext(next) { this.next = next; return next; }
    async handle(ctx) { if (this.next) return this.next.handle(ctx); return true; }
}

class RequiredFieldsValidator extends Validator {
    async handle(ctx) {
        const { date, startTime, endTime } = ctx.body || {};
        if (!date || !startTime || !endTime) {
            throw new Error('date, startTime and endTime required');
        }
        return super.handle(ctx);
    }
}

class TimeOrderValidator extends Validator {
    async handle(ctx) {
        const { startTime, endTime } = ctx.body || {};
        if (!startTime || !endTime) return super.handle(ctx);
        const s = new Date(startTime).getTime();
        const e = new Date(endTime).getTime();
        if (!(s < e)) throw new Error('startTime must be earlier than endTime');
        return super.handle(ctx);
    }
}

module.exports = {
    Validator,
    RequiredFieldsValidator,
    TimeOrderValidator,
};
