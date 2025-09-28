class Validator {
  setNext(next) { this.next = next; return next; }
  async handle(ctx) { return this.next ? this.next.handle(ctx) : ctx; }
}

// simple RBAC guard (useful if you want a visible chain in addition to middleware)
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
