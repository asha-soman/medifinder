const { expect } = require("chai");
const sinon = require("sinon");
const mongoose = require("mongoose");

const DoctorProfile = require("../models/doctorProfile.model");
const { eventBus } = require("../shared/observers/eventBus");
const AuditLog = require("../models/auditLog.model");
const { DoctorProfileService: doctorService } = require("../services/doctorProfile.service");

describe("Doctor profile service", () => {
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

    const findOne = sandbox.stub(DoctorProfile, "findOne").resolves(existing);
    const create = sandbox.stub(DoctorProfile, "create").resolves();

    const result = await doctorService.getByUserId(userId);

    expect(result).to.equal(existing);
    sinon.assert.calledOnce(findOne);
    sinon.assert.notCalled(create);
  });

  it("getByUserId() - creates a profile if none exists", async () => {
    const userId = new mongoose.Types.ObjectId();
    const created = { _id: new mongoose.Types.ObjectId(), userId };

    sandbox.stub(DoctorProfile, "findOne").resolves(null);
    const create = sandbox.stub(DoctorProfile, "create").resolves(created);

    const result = await doctorService.getByUserId(userId);

    expect(result).to.equal(created);
    sinon.assert.calledOnceWithExactly(create, { userId });
  });

  it("update() - updates allowed fields, trims strings, emits event + audit", async () => {
    const userId = new mongoose.Types.ObjectId();

    const before = {
      userId: userId.toString(),
      specialization: "  old spec  ",
      contact: " 0000000000 ",
    };

    const updated = {
      _id: new mongoose.Types.ObjectId(),
      userId,
      specialization: "Cardiology",
      contact: "0123456789",
    };

    const patch = {
      specialization: "  Cardiology ",
      contact: " 0123456789 ",
      hacker: "ignore-me",
      userId: new mongoose.Types.ObjectId(),
    };

    const findOne = sandbox.stub(DoctorProfile, "findOne").resolves({ toObject: () => before });
    const findOneAndUpdate = sandbox.stub(DoctorProfile, "findOneAndUpdate").resolves(updated);
    const emit = sandbox.stub(eventBus, "emit");
    const auditStub = sandbox.stub(AuditLog, "create").resolves(); 

    const res = await doctorService.update(userId, patch);

    expect(res).to.equal(updated);

    sinon.assert.calledWithMatch(
      findOneAndUpdate,
      { userId },
      { $set: { specialization: "Cardiology", contact: "0123456789" } },
      { new: true, upsert: true }
    );

    sinon.assert.calledOnceWithExactly(emit, "profile.updated", {
      userId,
      role: "doctor",
      changes: ["specialization", "contact"],
    });

    sinon.assert.calledOnce(auditStub);
    sinon.assert.calledOnce(findOne);
  });

  it("update() - empty/unknown patch → $set:{} ; emits [] changes ; audits", async () => {
    const userId = new mongoose.Types.ObjectId();
    const existing = { _id: new mongoose.Types.ObjectId(), userId, specialization: "Derm", contact: "111" };

    sandbox.stub(DoctorProfile, "findOne").resolves({ toObject: () => existing });
    const findOneAndUpdate = sandbox.stub(DoctorProfile, "findOneAndUpdate").resolves(existing);
    const emit = sandbox.stub(eventBus, "emit");
    const auditStub = sandbox.stub(AuditLog, "create").resolves();

    const res = await doctorService.update(userId, { foo: "bar", baz: true });

    expect(res).to.equal(existing);
    sinon.assert.calledWithMatch(findOneAndUpdate, { userId }, { $set: {} }, { new: true, upsert: true });
    sinon.assert.calledOnceWithExactly(emit, "profile.updated", { userId, role: "doctor", changes: [] });
    sinon.assert.calledOnce(auditStub);
  });

  it("update() - partial: only specialization is updated & trimmed", async () => {
    const userId = new mongoose.Types.ObjectId();
    const before = { userId: userId.toString(), specialization: "Derm", contact: "999" };
    const updated = { _id: new mongoose.Types.ObjectId(), userId, specialization: "Neurology", contact: "999" };

    sandbox.stub(DoctorProfile, "findOne").resolves({ toObject: () => before });
    const findOneAndUpdate = sandbox.stub(DoctorProfile, "findOneAndUpdate").resolves(updated);
    const emit = sandbox.stub(eventBus, "emit");
    const auditStub = sandbox.stub(AuditLog, "create").resolves();

    const res = await doctorService.update(userId, { specialization: "  Neurology " });

    expect(res).to.equal(updated);
    sinon.assert.calledWithMatch(
      findOneAndUpdate,
      { userId },
      { $set: { specialization: "Neurology" } },
      { new: true, upsert: true }
    );
    sinon.assert.calledOnceWithExactly(emit, "profile.updated", { userId, role: "doctor", changes: ["specialization"] });
    sinon.assert.calledOnce(auditStub);
  });

  it("update() - blank contact kept as empty string after trim (and only that field changes)", async () => {
    const userId = new mongoose.Types.ObjectId();
    const before = { userId: userId.toString(), specialization: "Derm", contact: "999" };
    const updated = { _id: new mongoose.Types.ObjectId(), userId, specialization: "Derm", contact: "" };

    sandbox.stub(DoctorProfile, "findOne").resolves({ toObject: () => before });
    const findOneAndUpdate = sandbox.stub(DoctorProfile, "findOneAndUpdate").resolves(updated);
    const emit = sandbox.stub(eventBus, "emit");
    const auditStub = sandbox.stub(AuditLog, "create").resolves();

    const res = await doctorService.update(userId, { contact: "   " });

    expect(res).to.equal(updated);
    sinon.assert.calledWithMatch(
      findOneAndUpdate,
      { userId },
      { $set: { contact: "" } },
      { new: true, upsert: true }
    );
    sinon.assert.calledOnceWithExactly(emit, "profile.updated", { userId, role: "doctor", changes: ["contact"] });
    sinon.assert.calledOnce(auditStub);
  });
});
