const { expect } = require("chai");
const sinon = require("sinon");
const jwt = require("jsonwebtoken");
const { authenticate, requireRole } = require("../middleware/auth.middleware");

describe("auth.middleware", () => {
  let sandbox;
  const mkRes = () => {
    const res = { status: sinon.stub().returnsThis(), json: sinon.stub().returnsThis() };
    return res;
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    process.env.JWT_SECRET = "unit-secret";
  });
  afterEach(() => sandbox.restore());

  /* -------------------- authenticate() -------------------- */

  it("authenticate - 401 when no token", () => {
    const req = { headers: {} };
    const res = mkRes();
    const next = sinon.spy();

    authenticate(req, res, next);

    sinon.assert.calledWithExactly(res.status, 401);
    sinon.assert.calledWith(res.json, { error: "Unauthorized" });
    sinon.assert.notCalled(next);
  });

  it("authenticate - 401 with invalid token", () => {
    const req = { headers: { authorization: "Bearer bad" } };
    const res = mkRes();
    const next = sinon.spy();
    sandbox.stub(jwt, "verify").throws(new Error("bad token"));

    authenticate(req, res, next);

    sinon.assert.calledWithExactly(res.status, 401);
    sinon.assert.calledWith(res.json, { error: "Invalid token" });
    sinon.assert.notCalled(next);
  });

  it("authenticate - attaches payload & calls next on valid", () => {
    const req = { headers: { authorization: "Bearer good" } };
    const res = mkRes();
    const next = sinon.spy();
    const payload = { sub: "u1", role: "doctor" };
    sandbox.stub(jwt, "verify").returns(payload);

    authenticate(req, res, next);

    expect(req.user).to.eql(payload);
    sinon.assert.calledOnce(next);
  });

  it("authenticate - passes token and env secret to jwt.verify", () => {
    const req = { headers: { authorization: "Bearer abc123" } };
    const res = mkRes();
    const next = sinon.spy();
    const verify = sandbox.stub(jwt, "verify").returns({ sub: "u1" });

    authenticate(req, res, next);

    sinon.assert.calledWithExactly(verify, "abc123", "unit-secret");
    sinon.assert.calledOnce(next);
  });

  it("authenticate - 401 when Authorization uses non-Bearer scheme", () => {
    const req = { headers: { authorization: "Token abc123" } };
    const res = mkRes();
    const next = sinon.spy();

    authenticate(req, res, next);

    sinon.assert.calledWithExactly(res.status, 401);
    sinon.assert.calledWith(res.json, { error: "Unauthorized" });
    sinon.assert.notCalled(next);
  });

  it("authenticate - 401 when 'Bearer' has no token", () => {
    const req = { headers: { authorization: "Bearer " } }; 
    const res = mkRes();
    const next = sinon.spy();

    authenticate(req, res, next);

    sinon.assert.calledWithExactly(res.status, 401);
    sinon.assert.calledWith(res.json, { error: "Unauthorized" });
    sinon.assert.notCalled(next);
  });

  it("authenticate - case-sensitive scheme: 'bearer' is rejected", () => {
    const req = { headers: { authorization: "bearer abc" } };
    const res = mkRes();
    const next = sinon.spy();

    authenticate(req, res, next);

    sinon.assert.calledWithExactly(res.status, 401);
    sinon.assert.calledWith(res.json, { error: "Unauthorized" });
    sinon.assert.notCalled(next);
  });

  /* -------------------- requireRole() --------------------- */

  it("requireRole - 401 if not authenticated", () => {
    const req = {};
    const res = mkRes();
    const next = sinon.spy();

    requireRole("doctor")(req, res, next);

    sinon.assert.calledWithExactly(res.status, 401);
    sinon.assert.calledWith(res.json, { error: "Unauthorized" });
    sinon.assert.notCalled(next);
  });

  it("requireRole - 403 if wrong role", () => {
    const req = { user: { role: "patient" } };
    const res = mkRes();
    const next = sinon.spy();

    requireRole("doctor")(req, res, next);

    sinon.assert.calledWithExactly(res.status, 403);
    sinon.assert.calledWith(res.json, { error: "Forbidden" });
    sinon.assert.notCalled(next);
  });

  it("requireRole - role matching calls next", () => {
    const req = { user: { role: "doctor" } };
    const res = mkRes();
    const next = sinon.spy();

    requireRole("doctor")(req, res, next);

    sinon.assert.calledOnce(next);
  });

  it("requireRole - case-sensitive comparison ('Doctor' ≠ 'doctor')", () => {
    const req = { user: { role: "Doctor" } };
    const res = mkRes();
    const next = sinon.spy();

    requireRole("doctor")(req, res, next);

    sinon.assert.calledWithExactly(res.status, 403);
    sinon.assert.calledWith(res.json, { error: "Forbidden" });
    sinon.assert.notCalled(next);
  });

  it("requireRole - supports other roles (patient)", () => {
    const req = { user: { role: "patient" } };
    const res = mkRes();
    const next = sinon.spy();

    requireRole("patient")(req, res, next);

    sinon.assert.calledOnce(next);
  });
});
