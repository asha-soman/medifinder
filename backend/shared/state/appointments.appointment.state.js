class BaseState {
    constructor(ctx) { this.ctx = ctx; }
    _invalid(action) { const e = new Error(`Invalid transition: ${this.ctx.status} -> ${action}`); e.status = 400; throw e; }
    accept() { this._invalid('accept'); }
    reschedule() { this._invalid('reschedule'); }
    cancel() { this._invalid('cancel'); }
    complete() { this._invalid('complete'); }
}
class Booked extends BaseState {
    accept() { return this.ctx._set('accepted'); }
    reschedule() { return this.ctx._set('rescheduled'); }
    cancel() { return this.ctx._set('cancelled'); }
    complete() { return this.ctx._set('completed'); }
}
class Accepted extends BaseState {
    reschedule() { return this.ctx._set('rescheduled'); }
    cancel() { return this.ctx._set('cancelled'); }
    complete() { return this.ctx._set('completed'); }
}
class Rescheduled extends BaseState {
    accept() { return this.ctx._set('accepted'); }
    cancel() { return this.ctx._set('cancelled'); }
}
class Cancelled extends BaseState { }
class Completed extends BaseState { }

const MAP = { booked: Booked, accepted: Accepted, rescheduled: Rescheduled, cancelled: Cancelled, completed: Completed };

class AppointmentStateContext {
    constructor(currentStatus, setter) {
        this.status = currentStatus;
        this._setter = setter;
        this._bind();
    }
    _bind() { const C = MAP[this.status] || Booked; this.state = new C(this); }
    _set(next) { this.status = next; this._bind(); return this._setter(next); }
    accept() { return this.state.accept(); }
    reschedule() { return this.state.reschedule(); }
    cancel() { return this.state.cancel(); }
    complete() { return this.state.complete(); }
}
module.exports = AppointmentStateContext;
