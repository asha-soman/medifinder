//Note: for design pattern part of the report, i made this exp:
//This validator file is like a checkpoint system for booking requests.
//It makes sure the user has the right role (doctor or patient),
//that the request includes a start time, and not in the part
//In short, it helps stop invalid bookings before they go through.

class Validator {
  setNext(next) { this.next = next; return next; }
  async handle(ctx) { return this.next ? this.next.handle(ctx) : ctx; }
}

// RBAC
class RbacValidator extends Validator {
  constructor(requiredRole) { super(); this.requiredRole = requiredRole; }
  async handle(ctx) {
    if (!ctx.user || ctx.user.role !== this.requiredRole) {
      throw new Error('Forbidden: Insufficient permissions');
    }
    return super.handle(ctx);
  }
}

class StartRequiredValidator extends Validator {
  async handle(ctx) {
    if (!ctx.body?.start) throw new Error('start (ISO) is required');
    return super.handle(ctx);
  }
}

class NoPastStartValidator extends Validator {
  async handle(ctx) {
    if (ctx.body?.start && new Date(ctx.body.start) < new Date()) {
      throw new Error('Cannot book in the past');
    }
    return super.handle(ctx);
  }
}

module.exports = {
  Validator,
  RbacValidator,
  StartRequiredValidator,
  NoPastStartValidator
};
