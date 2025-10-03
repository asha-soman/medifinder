const { expect } = require("chai");
const sinon = require("sinon");
const mongoose = require("mongoose");

const PatientProfile = require("../models/patientProfile.model");
const { eventBus } = require("../shared/observers/eventBus");
const { PatientProfileService: patientService } = require("../services/patientProfile.service");
const AuditLog = require("../models/auditLog.model");

describe("Patient profile service", () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("getByUserId() - returns existing doc without creating", async () => {
    const userId = new mongoose.Types.ObjectId();
    const existing = { _id: new mongoose.Types.ObjectId(), userId };

    const findOne = sandbox.stub(PatientProfile, "findOne").resolves(existing);
    const create = sandbox.stub(PatientProfile, "create").resolves();

    const result = await patientService.getByUserId(userId);

    expect(result).to.equal(existing);
    sinon.assert.calledOnce(findOne);
    sinon.assert.notCalled(create);
  });

  it("getByUserId() - creates a profile if none exists", async () => {
    const userId = new mongoose.Types.ObjectId();
    const created = { _id: new mongoose.Types.ObjectId(), userId };

    sandbox.stub(PatientProfile, "findOne").resolves(null);
    const create = sandbox.stub(PatientProfile, "create").resolves(created);

    const result = await patientService.getByUserId(userId);

    expect(result).to.equal(created);
    sinon.assert.calledOnceWithExactly(create, { userId });
  });

  it("update() - updates allowed fields, trims strings, emits event", async () => {
    const userId = new mongoose.Types.ObjectId();
    const before = { userId: userId.toString(), contact: "  old  ", address: "Old", dateOfBirth: null };
    const updated = {
      _id: new mongoose.Types.ObjectId(),
      userId,
      contact: "0123456789",
      address: "New Address",
      dateOfBirth: new Date("1999-01-01"),
    };

    const patch = {
      contact: " 0123456789 ",
      address: " New Address ",
      dateOfBirth: new Date("1999-01-01"),
      hacker: "should be ignored",
      userId: new mongoose.Types.ObjectId(), // should be ignored
    };

    const findOne = sandbox.stub(PatientProfile, "findOne").resolves({ toObject: () => before });
    const findOneAndUpdate = sandbox.stub(PatientProfile, "findOneAndUpdate").resolves(updated);
    const emit = sandbox.stub(eventBus, "emit");
    const auditStub = sandbox.stub(AuditLog, "create").resolves();

    const res = await patientService.update(userId, patch);

    expect(res).to.equal(updated);

    sinon.assert.calledWithMatch(
      findOneAndUpdate,
      { userId },
      { $set: { dateOfBirth: patch.dateOfBirth, contact: "0123456789", address: "New Address" } },
      { new: true, upsert: true }
    );

    sinon.assert.calledOnceWithExactly(emit, "profile.updated", {
      userId,
      role: "patient",
      changes: ["dateOfBirth", "contact", "address"],
    });

    sinon.assert.calledOnce(auditStub);
    sinon.assert.calledOnce(findOne);
  });

  it("update() - empty/unknown patch results in $set:{} and emits [] changes, audits once", async () => {
    const userId = new mongoose.Types.ObjectId();
    const existing = { _id: new mongoose.Types.ObjectId(), userId, contact: "c", address: "a" };

    sandbox.stub(PatientProfile, "findOne").resolves({ toObject: () => existing });
    const findOneAndUpdate = sandbox.stub(PatientProfile, "findOneAndUpdate").resolves(existing);
    const emit = sandbox.stub(eventBus, "emit");
    const auditStub = sandbox.stub(AuditLog, "create").resolves();

    const res = await patientService.update(userId, { ignored: true, alsoIgnored: 1 });

    expect(res).to.equal(existing);
    sinon.assert.calledWithMatch(findOneAndUpdate, { userId }, { $set: {} }, { new: true, upsert: true });
    sinon.assert.calledOnceWithExactly(emit, "profile.updated", { userId, role: "patient", changes: [] });
    sinon.assert.calledOnce(auditStub);
  });

  it("update() - partial: updates only contact and trims", async () => {
    const userId = new mongoose.Types.ObjectId();
    const before = { userId: userId.toString(), contact: "old", address: "keep" };
    const updated = { _id: new mongoose.Types.ObjectId(), userId, contact: "0001112222", address: "keep" };

    sandbox.stub(PatientProfile, "findOne").resolves({ toObject: () => before });
    const findOneAndUpdate = sandbox.stub(PatientProfile, "findOneAndUpdate").resolves(updated);
    const emit = sandbox.stub(eventBus, "emit");
    const auditStub = sandbox.stub(AuditLog, "create").resolves();

    const res = await patientService.update(userId, { contact: " 0001112222 " });

    expect(res).to.equal(updated);

    sinon.assert.calledWithMatch(
      findOneAndUpdate,
      { userId },
      { $set: { contact: "0001112222" } },
      { new: true, upsert: true }
    );

    sinon.assert.calledOnceWithExactly(emit, "profile.updated", {
      userId,
      role: "patient",
      changes: ["contact"],
    });
    sinon.assert.calledOnce(auditStub);
  });

  it("update() - ignores falsy dateOfBirth but keeps trimmed empty address", async () => {
    const userId = new mongoose.Types.ObjectId();
    const before = { userId: userId.toString(), contact: "c", address: "a" };
    const updated = { _id: new mongoose.Types.ObjectId(), userId, contact: "c", address: "" };

    sandbox.stub(PatientProfile, "findOne").resolves({ toObject: () => before });
    const findOneAndUpdate = sandbox.stub(PatientProfile, "findOneAndUpdate").resolves(updated);
    const emit = sandbox.stub(eventBus, "emit");
    const auditStub = sandbox.stub(AuditLog, "create").resolves();

    const res = await patientService.update(userId, { dateOfBirth: null, address: "   " });

    expect(res).to.equal(updated);

    sinon.assert.calledWithMatch(
      findOneAndUpdate,
      { userId },
      { $set: { address: "" } },
      { new: true, upsert: true }
    );

    sinon.assert.calledOnceWithExactly(emit, "profile.updated", {
      userId,
      role: "patient",
      changes: ["address"],
    });
    sinon.assert.calledOnce(auditStub);
  });
});
