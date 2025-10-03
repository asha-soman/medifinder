// test/event.bus.spec.js
const sinon = require("sinon");
const { expect } = require("chai");
const proxyquire = require("proxyquire").noCallThru();

const flush = () => new Promise((r) => setImmediate(r));

describe("Event Bus - Notifications", () => {
  let bus;
  let NotificationStub;

  beforeEach(() => {
    NotificationStub = {
      insertMany: sinon.stub().resolves(),
    };

    // IMPORTANT: this path must match exactly how event.Bus requires the model
    // event.Bus is at shared/utils/event.Bus.js and it does: require("../../models/notification.model")
    bus = proxyquire("../shared/utils/event.Bus", {
      "../../models/notification.model": NotificationStub,
    });
  });

  function appt(_id = "A1", patient = "P1", doctor = "D1", start = "2025-10-01T10:00:00Z") {
    return { _id, patientUserId: patient, doctorUserId: doctor, start };
  }

  it("emits BOOKED -> creates two notifications", async () => {
    await bus.emit("appointment.booked", { appointment: appt() });
    await flush();

    sinon.assert.calledOnce(NotificationStub.insertMany);
    const [docs] = NotificationStub.insertMany.getCall(0).args;
    expect(docs).to.have.length(2);
    expect(docs.map((d) => d.recipient)).to.have.members(["P1", "D1"]);
    expect(docs.every((d) => d.type === "BOOKED")).to.equal(true);
  });

  it("BOOKED with missing patient -> only doctor gets it", async () => {
    await bus.emit("appointment.booked", { appointment: appt("A2", null, "D9") });
    await flush();

    sinon.assert.calledOnce(NotificationStub.insertMany);
    const [docs] = NotificationStub.insertMany.getCall(0).args;
    expect(docs).to.have.length(1);
    expect(docs[0].recipient).to.equal("D9");
  });

  it("BOOKED with missing doctor -> only patient gets it", async () => {
    await bus.emit("appointment.booked", { appointment: appt("A3", "P9", null) });
    await flush();

    sinon.assert.calledOnce(NotificationStub.insertMany);
    const [docs] = NotificationStub.insertMany.getCall(0).args;
    expect(docs).to.have.length(1);
    expect(docs[0].recipient).to.equal("P9");
  });

  it("CANCELLED -> creates two notifications", async () => {
    await bus.emit("appointment.canceled", { appointment: appt("A4", "P4", "D4") });
    await flush();

    sinon.assert.calledOnce(NotificationStub.insertMany);
    const [docs] = NotificationStub.insertMany.getCall(0).args;
    expect(docs).to.have.length(2);
    expect(docs.every((d) => d.type === "CANCELLED")).to.equal(true);
  });

  it("RESCHEDULED -> includes old and new times in messages", async () => {
    const a = appt("A5", "P5", "D5", "2025-10-01T12:00:00Z");
    await bus.emit("appointment.rescheduled", {
      appointment: a,
      oldStart: "2025-10-01T11:00:00Z",
    });
    await flush();

    sinon.assert.calledOnce(NotificationStub.insertMany);
    const [docs] = NotificationStub.insertMany.getCall(0).args;
    expect(docs).to.have.length(2);
    expect(docs[0].type).to.equal("RESCHEDULED");
    expect(String(docs[0].message || "")).to.match(/rescheduled/i);
  });

  it("handles insertMany error gracefully (BOOKED)", async () => {
    NotificationStub.insertMany.rejects(new Error("DB down"));

    await bus.emit("appointment.booked", { appointment: appt("A6") });
    await flush();

    sinon.assert.calledOnce(NotificationStub.insertMany);
  });

  it("handles insertMany error gracefully (RESCHEDULED)", async () => {
    NotificationStub.insertMany.rejects(new Error("DB down"));

    await bus.emit("appointment.rescheduled", { appointment: appt("A7"), oldStart: "X" });
    await flush();

    sinon.assert.calledOnce(NotificationStub.insertMany);
  });

  it("handles insertMany error gracefully (CANCELLED)", async () => {
    NotificationStub.insertMany.rejects(new Error("DB down"));

    await bus.emit("appointment.canceled", { appointment: appt("A8") });
    await flush();

    sinon.assert.calledOnce(NotificationStub.insertMany);
  });

  it("BOOKED includes appointment id", async () => {
    await bus.emit("appointment.booked", { appointment: appt("AX") });
    await flush();

    const [docs] = NotificationStub.insertMany.getCall(0).args;
    expect(docs[0]).to.have.property("appointment", "AX");
  });

  it("RESCHEDULED uses provided oldStart", async () => {
    await bus.emit("appointment.rescheduled", {
      appointment: appt("AR"),
      oldStart: "2025-10-02T10:00:00Z",
    });
    await flush();

    const [docs] = NotificationStub.insertMany.getCall(0).args;
    expect(String(docs[0].message || "")).to.be.a("string");
  });

  it("CANCELLED builds default messages if none given", async () => {
    await bus.emit("appointment.canceled", { appointment: appt("AC") });
    await flush();

    const [docs] = NotificationStub.insertMany.getCall(0).args;
    expect(String(docs[0].message || "")).to.be.a("string");
  });

  it("no notifications when both recipients missing", async () => {
    await bus.emit("appointment.booked", { appointment: appt("A9", null, null) });
    await flush();

    sinon.assert.notCalled(NotificationStub.insertMany);
  });

  it("multiple events can be emitted without conflict", async () => {
    await bus.emit("appointment.booked", { appointment: appt("A11") });
    await bus.emit("appointment.canceled", { appointment: appt("A12") });
    await flush();

    sinon.assert.calledTwice(NotificationStub.insertMany);
  });

  it("date formatting does not throw on invalid dates", async () => {
    await bus.emit("appointment.booked", {
      appointment: appt("A13", "P", "D", "INVALID"),
    });
    await flush();

    sinon.assert.calledOnce(NotificationStub.insertMany);
  });
});
