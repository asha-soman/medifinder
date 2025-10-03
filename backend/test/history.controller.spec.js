// test/history.controller.spec.js
const sinon = require("sinon");
const { expect } = require("chai");
const proxyquire = require("proxyquire").noCallThru();

function fakeApptFind(rows) {
  return {
    sort: () => ({
      lean: async () => rows,
    }),
  };
}

function fakeUserFind(rows) {
  return {
    select: () => ({
      lean: async () => rows,
    }),
  };
}

function fakeProfileFind(rows) {
  return {
    select: () => ({
      lean: async () => rows,
    }),
  };
}

describe("History Controller - listCompleted", () => {
  let listCompleted;
  let AppointmentStub, UserStub, DoctorProfileStub;

  beforeEach(() => {
    AppointmentStub = { find: sinon.stub() };
    UserStub = { find: sinon.stub() };
    DoctorProfileStub = { find: sinon.stub() };

    ({ listCompleted } = proxyquire("../controllers/history.controller", {
      "../models/appointment.model": AppointmentStub,
      "../models/user.model": { UserModel: UserStub },
      "../models/doctorProfile.model": DoctorProfileStub,
    }));
  });

  function makeRes() {
    return {
      code: null,
      body: null,
      status(c) { this.code = c; return this; },
      json(o) { this.body = o; return this; },
    };
  }

  it("401 when no user on req", async () => {
    const req = { user: null };
    const res = makeRes();
    await listCompleted(req, res);
    expect(res.code).to.equal(401);
    expect(res.body).to.deep.equal({ message: "Unauthorized" });
  });

  it("reads patient id from req.user._id", async () => {
    const req = { user: { _id: "U1", role: "patient" } };
    const res = makeRes();

    AppointmentStub.find.returns(fakeApptFind([]));
    await listCompleted(req, res);

    sinon.assert.calledWith(AppointmentStub.find, {
      status: "COMPLETED",
      patientUserId: "U1",
    });
    expect(res.body).to.deep.equal({ items: [] });
  });

  it("reads patient id from req.user.id", async () => {
    const req = { user: { id: "U2", role: "patient" } };
    const res = makeRes();

    AppointmentStub.find.returns(fakeApptFind([]));
    await listCompleted(req, res);

    sinon.assert.calledWith(AppointmentStub.find, {
      status: "COMPLETED",
      patientUserId: "U2",
    });
  });

  it("reads from req.user.userId", async () => {
    const req = { user: { userId: "U3", role: "patient" } };
    const res = makeRes();

    AppointmentStub.find.returns(fakeApptFind([]));
    await listCompleted(req, res);

    sinon.assert.calledWith(AppointmentStub.find, {
      status: "COMPLETED",
      patientUserId: "U3",
    });
  });

  it("reads from req.user.sub", async () => {
    const req = { user: { sub: "U4", role: "patient" } };
    const res = makeRes();

    AppointmentStub.find.returns(fakeApptFind([]));
    await listCompleted(req, res);

    sinon.assert.calledWith(AppointmentStub.find, {
      status: "COMPLETED",
      patientUserId: "U4",
    });
  });

  it("reads nested req.user.user._id", async () => {
    const req = { user: { user: { _id: "U5", role: "patient" } } };
    const res = makeRes();

    AppointmentStub.find.returns(fakeApptFind([]));
    await listCompleted(req, res);

    sinon.assert.calledWith(AppointmentStub.find, {
      status: "COMPLETED",
      patientUserId: "U5",
    });
  });

  it("doctor role uses doctorUserId filter", async () => {
    const req = { user: { _id: "D1", role: "doctor" } };
    const res = makeRes();

    AppointmentStub.find.returns(fakeApptFind([]));
    await listCompleted(req, res);

    sinon.assert.calledWith(AppointmentStub.find, {
      status: "COMPLETED",
      doctorUserId: "D1",
    });
  });

  it("maps items with user and doctor profile data (profile.user)", async () => {
    const req = { user: { _id: "P1", role: "patient" } };
    const res = makeRes();

    AppointmentStub.find.returns(fakeApptFind([
      { _id:"A1", status:"COMPLETED", start:"2025-10-01T01:00:00Z", end:"2025-10-01T02:00:00Z", patientUserId:"P1", doctorUserId:"D9" }
    ]));
    UserStub.find.returns(fakeUserFind([
      { _id:"P1", name:"Pat", email:"p@e.com", role:"patient" },
      { _id:"D9", name:"Doc D", email:"d@e.com", role:"doctor" },
    ]));
    DoctorProfileStub.find.returns(fakeProfileFind([
      { user:"D9", specialization:"Cardiology", contact:"07 1111 2222" }
    ]));

    await listCompleted(req, res);

    expect(res.body.items).to.have.length(1);
    expect(res.body.items[0]).to.deep.include({ _id:"A1", status:"COMPLETED" });
    expect(res.body.items[0].doctor).to.deep.include({
      _id:"D9",
      name:"Doc D",
      specialization:"Cardiology",
      contact:"07 1111 2222",
    });
  });

  it("also supports doctorProfile.userId schema", async () => {
    const req = { user: { _id: "P2", role: "patient" } };
    const res = makeRes();

    AppointmentStub.find.returns(fakeApptFind([
      { _id:"A2", status:"COMPLETED", start:"X", end:"Y", patientUserId:"P2", doctorUserId:"D10" }
    ]));
    UserStub.find.returns(fakeUserFind([
      { _id:"P2", name:"Pat2", email:"p2@e.com" },
      { _id:"D10", name:"Doc10", email:"d10@e.com" },
    ]));
    DoctorProfileStub.find.returns(fakeProfileFind([
      { userId:"D10", specialization:"Dermatology", contact:"07 9999 0000" }
    ]));

    await listCompleted(req, res);

    expect(res.body.items[0].doctor.specialization).to.equal("Dermatology");
  });

  it("handles missing user records gracefully", async () => {
    const req = { user: { _id: "P3", role: "patient" } };
    const res = makeRes();

    AppointmentStub.find.returns(fakeApptFind([
      { _id:"A3", status:"COMPLETED", start:"S", end:"E", patientUserId:"P3", doctorUserId:"D11" }
    ]));
    UserStub.find.returns(fakeUserFind([]));
    DoctorProfileStub.find.returns(fakeProfileFind([]));

    await listCompleted(req, res);

    expect(res.body.items[0].patient).to.deep.equal({ _id:"P3", name:"", email:"" });
    expect(res.body.items[0].doctor).to.deep.include({ _id:"D11", name:"", email:"" });
  });

  it("returns [] when no completed appts", async () => {
    const req = { user: { _id: "P4", role: "patient" } };
    const res = makeRes();

    AppointmentStub.find.returns(fakeApptFind([]));
    await listCompleted(req, res);

    expect(res.body).to.deep.equal({ items: [] });
  });

  it("uses uppercase COMPLETED status", async () => {
    const req = { user: { _id: "P5", role: "patient" } };
    const res = makeRes();

    AppointmentStub.find.returns(fakeApptFind([]));
    await listCompleted(req, res);

    const arg = AppointmentStub.find.getCall(0).args[0];
    expect(arg.status).to.equal("COMPLETED");
  });

  it("sorts by updatedAt desc (delegated to chain)", async () => {
    const req = { user: { _id: "P6", role: "patient" } };
    const res = makeRes();

    const sortSpy = sinon.spy(() => ({ lean: async () => [] }));
    AppointmentStub.find.returns({ sort: sortSpy });

    await listCompleted(req, res);

    sinon.assert.calledWith(sortSpy, { updatedAt: -1 });
  });

  it("doctor sees their completed visits (patient block populated)", async () => {
    const req = { user: { _id: "D20", role: "doctor" } };
    const res = makeRes();

    AppointmentStub.find.returns(fakeApptFind([
      { _id:"A20", status:"COMPLETED", start:"s", end:"e", patientUserId:"P20", doctorUserId:"D20" }
    ]));
    UserStub.find.returns(fakeUserFind([
      { _id:"P20", name:"Pat 20", email:"p20@e.com" },
      { _id:"D20", name:"Doc 20", email:"d20@e.com" },
    ]));
    DoctorProfileStub.find.returns(fakeProfileFind([
      { user:"D20", specialization:"Neuro", contact:"07 1234 5678" }
    ]));

    await listCompleted(req, res);

    expect(res.body.items[0].patient.name).to.equal("Pat 20");
  });

  it("unknown role defaults to patient filter", async () => {
    const req = { user: { _id: "X1", role: "something" } };
    const res = makeRes();

    AppointmentStub.find.returns(fakeApptFind([]));
    await listCompleted(req, res);

    sinon.assert.calledWith(AppointmentStub.find, {
      status: "COMPLETED",
      patientUserId: "X1",
    });
  });

  it("reads role from nested user", async () => {
    const req = { user: { user: { _id: "D55", role: "doctor" } } };
    const res = makeRes();

    AppointmentStub.find.returns(fakeApptFind([]));
    await listCompleted(req, res);

    sinon.assert.calledWith(AppointmentStub.find, {
      status: "COMPLETED",
      doctorUserId: "D55",
    });
  });

  it("500 when underlying throws", async () => {
    const req = { user: { _id: "P9", role: "patient" } };
    const res = makeRes();

    AppointmentStub.find.throws(new Error("DB boom"));
    await listCompleted(req, res);

    expect(res.code).to.equal(500);
    expect(String(res.body.message)).to.match(/boom/i);
  });

  it("maps output structure consistently", async () => {
    const req = { user: { _id: "P7", role: "patient" } };
    const res = makeRes();

    AppointmentStub.find.returns(fakeApptFind([
      { _id:"A7", status:"COMPLETED", start:"2025-10-01", end:"2025-10-01", patientUserId:"P7", doctorUserId:"D7" }
    ]));
    UserStub.find.returns(fakeUserFind([
      { _id:"P7", name:"P", email:"p@p" },
      { _id:"D7", name:"D", email:"d@d" },
    ]));
    DoctorProfileStub.find.returns(fakeProfileFind([
      { user:"D7", specialization:"GP", contact:"c" }
    ]));

    await listCompleted(req, res);

    expect(res.body.items[0]).to.have.keys(["_id","start","end","status","patient","doctor"]);
  });
});
