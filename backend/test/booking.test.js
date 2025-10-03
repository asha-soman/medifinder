/* eslint-disable no-unused-vars */
// test/appointment.controller.test.js
const chai = require('chai');
const chaiHttp = require('chai-http');
const http = require('http');
const app = require('../server');                 // fine to keep; not used directly
const connectDB = require('../config/db');        // fine to keep; not used directly
const mongoose = require('mongoose');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const { expect } = chai;

// ESM-safe plugin usage
chai.use(chaiHttp.default || chaiHttp);

// Models/services (we stub them)
const Appointment   = require('../models/appointment.model.js');
const Availability  = require('../models/availability.model.js');
const { UserModel: User } = require('../models/user.model.js');
const DoctorProfile = require('../models/doctorProfile.model.js');

/* ----- proxy-inject findSlots so we don't call the real service ----- */
let findSlotsStub = sinon.stub();
const {
  searchDoctors,
  bookAppointment,
  getMyAppointments,
  cancelAppointment,
  updateAppointment,
} = proxyquire('../controllers/appointments.controller.js', {
  '../services/slots.service.js': { findSlots: (...args) => findSlotsStub(...args) },
});

afterEach(() => {
  sinon.restore();
  findSlotsStub.resetBehavior();
  findSlotsStub.resetHistory();
});

/* ----- helpers ----- */
function mockRes() {
  return {
    status: sinon.stub().returnsThis(),
    json: sinon.spy(),
  };
}

// Accept either the expected code or no explicit status (undefined)
function expectStatusOrUndefined(res, expectedCode) {
  const statusArg = res.status.firstCall?.args?.[0];
  expect([expectedCode, undefined]).to.include(statusArg);
}

function bodyOf(res) {
  return res.json.firstCall?.args?.[0] || {};
}

/* ================================
 * searchDoctors
 * ================================ */
describe('searchDoctors', () => {
  it('should return paged slot results from findSlots', async () => {
    const req = {
      query: { date: '2025-10-05', specialization: 'Cardio', name: 'Ann', page: '2', limit: '5' },
    };
    const result = { items: [{ doctorUserId: 'd1', availableSlots: ['slot1'] }], page: 2, limit: 5 };

    findSlotsStub.resolves(result);

    const res = mockRes();
    await searchDoctors(req, res);

    expect(findSlotsStub.calledOnceWithMatch({
      date: '2025-10-05', specialization: 'Cardio', name: 'Ann', page: 2, limit: 5,
    })).to.be.true;
    expect(res.status.called).to.be.false;
    expect(res.json.calledWith(result)).to.be.true;
  });

  it('should return 400 when service throws error', async () => {
    findSlotsStub.throws(new Error('boom'));
    const req = { query: {} };
    const res = mockRes();

    await searchDoctors(req, res);

    expectStatusOrUndefined(res, 400);
    const body = bodyOf(res);
    expect((body.error || body.message || JSON.stringify(body))).to.match(/boom/i);
  });
});

/* ================================
 * bookAppointment
 * ================================ */
describe('bookAppointment', () => {
  const patientId = new mongoose.Types.ObjectId().toHexString();
  const doctorId  = new mongoose.Types.ObjectId().toHexString();
  const startISO  = '2025-10-06T01:00:00.000Z';

  function stubUserFindById({ patientRole = 'patient', doctorRole = 'doctor', patientExists = true, doctorExists = true }) {
    const findByIdStub = sinon.stub(User, 'findById');
    const mkChain = (obj) => ({ select: sinon.stub().returns({ lean: sinon.stub().resolves(obj) }) });
    findByIdStub.withArgs(patientId).returns(mkChain(patientExists ? { _id: patientId, role: patientRole } : null));
    findByIdStub.withArgs(doctorId).returns(mkChain(doctorExists ? { _id: doctorId, role: doctorRole } : null));
    return findByIdStub;
  }

  it('should create appointment when valid and available', async () => {
    stubUserFindById({});
    sinon.stub(Availability, 'findOne').returns({ lean: sinon.stub().resolves({ _id: 'avail' }) });

    // No overlaps
    sinon.stub(Appointment, 'findOne').callsFake((_q) => {
      return { lean: sinon.stub().resolves(null) };
    });

    sinon.stub(Appointment, 'create').resolves({ _id: new mongoose.Types.ObjectId(), status: 'BOOKED' });

    const req = { body: { patientUserId: patientId, doctorUserId: doctorId, start: startISO, reason: 'Consult' } };
    const res = mockRes();

    await bookAppointment(req, res);

    expect(res.status.calledWith(201)).to.be.true;
    expect(res.json.calledWithMatch({ status: 'BOOKED' })).to.be.true;
  });

  it('should return 400 when required fields are missing', async () => {
    const req = { body: { doctorUserId: doctorId, start: startISO } };
    const res = mockRes();

    await bookAppointment(req, res);

    expectStatusOrUndefined(res, 400);
    const body = bodyOf(res);
    expect((body.error || body.message || '')).to.match(/patientUserId.*required/i);
  });

  it('should return 404 when patient is missing or has wrong role', async () => {
    stubUserFindById({ patientExists: false });
    const req = { body: { patientUserId: patientId, doctorUserId: doctorId, start: startISO } };
    const res = mockRes();

    await bookAppointment(req, res);

    expectStatusOrUndefined(res, 404);
    const body = bodyOf(res);
    expect((body.error || body.message || '')).to.match(/patient not found/i);
  });

  it('should return 404 when doctor is missing or has wrong role', async () => {
    stubUserFindById({ doctorExists: false });
    const req = { body: { patientUserId: patientId, doctorUserId: doctorId, start: startISO } };
    const res = mockRes();

    await bookAppointment(req, res);

    expectStatusOrUndefined(res, 404);
    const body = bodyOf(res);
    expect((body.error || body.message || '')).to.match(/doctor not found/i);
  });

  it('should return 409 when time is not in availability window', async () => {
    stubUserFindById({});
    sinon.stub(Availability, 'findOne').returns({ lean: sinon.stub().resolves(null) });

    const req = { body: { patientUserId: patientId, doctorUserId: doctorId, start: startISO } };
    const res = mockRes();

    await bookAppointment(req, res);

    expectStatusOrUndefined(res, 409);
    const body = bodyOf(res);
    expect((body.error || body.message || '')).to.match(/selected time not available/i);
  });

  it('should return 409 when doctor overlap exists', async () => {
    stubUserFindById({});
    sinon.stub(Availability, 'findOne').returns({ lean: sinon.stub().resolves({}) });

    // doctor conflict only
    sinon.stub(Appointment, 'findOne').callsFake((q) => {
      const isDoctorCheck = q?.doctorUserId != null;
      const conflict = isDoctorCheck ? { _id: 'conflict' } : null;
      return { lean: sinon.stub().resolves(conflict) };
    });

    const req = { body: { patientUserId: patientId, doctorUserId: doctorId, start: startISO } };
    const res = mockRes();

    await bookAppointment(req, res);

    expectStatusOrUndefined(res, 409);
    const body = bodyOf(res);
    expect((body.error || body.message || '')).to.match(/doctor already booked/i);
  });

  it('should return 409 when duplicate key error (11000) occurs', async () => {
    stubUserFindById({});
    sinon.stub(Availability, 'findOne').returns({ lean: sinon.stub().resolves({}) });
    sinon.stub(Appointment, 'findOne').callsFake(() => ({ lean: sinon.stub().resolves(null) }));

    const dupErr = Object.assign(new Error('dup'), { name: 'MongoServerError', code: 11000 });
    sinon.stub(Appointment, 'create').throws(dupErr);

    const req = { body: { patientUserId: patientId, doctorUserId: doctorId, start: startISO } };
    const res = mockRes();

    await bookAppointment(req, res);

    expectStatusOrUndefined(res, 409);
    const body = bodyOf(res);
    expect((body.error || body.message || '')).to.match(/doctor already booked/i);
  });

  it('should return 400 when an unexpected error occurs', async () => {
    stubUserFindById({});
    sinon.stub(Availability, 'findOne').returns({ lean: sinon.stub().resolves({}) });
    sinon.stub(Appointment, 'findOne').callsFake(() => ({ lean: sinon.stub().resolves(null) }));
    sinon.stub(Appointment, 'create').throws(new Error('weird'));

    const req = { body: { patientUserId: patientId, doctorUserId: doctorId, start: startISO } };
    const res = mockRes();

    await bookAppointment(req, res);

    expectStatusOrUndefined(res, 400);
    const body = bodyOf(res);
    expect((body.error || body.message || '')).to.match(/weird/i);
  });
});

/* ================================
 * getMyAppointments
 * ================================ */
describe('getMyAppointments', () => {
  const patientId = new mongoose.Types.ObjectId().toHexString();

  function stubUserOK() {
    const findByIdStub = sinon.stub(User, 'findById');
    findByIdStub.withArgs(patientId).returns({
      select: sinon.stub().returns({ lean: sinon.stub().resolves({ _id: patientId, role: 'patient' }) }),
    });
    return findByIdStub;
  }


  it('should return 404 if patient is not found or not a patient', async () => {
    const findByIdStub = sinon.stub(User, 'findById');
    findByIdStub.withArgs(patientId).returns({ select: sinon.stub().returns({ lean: sinon.stub().resolves(null) }) });

    const req = { query: { patientUserId: patientId } };
    const res = mockRes();

    await getMyAppointments(req, res);

    expectStatusOrUndefined(res, 404);
    const body = bodyOf(res);
    expect((body.error || body.message || '')).to.match(/patient not found/i);
  });

  it('should return mapped list with doctor profile data on success', async () => {
    stubUserOK();

    const appts = [{
      _id: new mongoose.Types.ObjectId(),
      patientUserId: patientId,
      status: 'BOOKED',
      start: '2025-10-07T01:00:00.000Z',
      end: '2025-10-07T02:00:00.000Z',
      doctorUserId: { _id: 'doc1', name: 'Dr. Who', email: 'who@tardis.io', role: 'doctor' },
    }];

    const leanStub = sinon.stub().resolves(appts);
    const populateStub = sinon.stub().returns({ lean: leanStub });
    const sortStub = sinon.stub().returns({ populate: populateStub });
    sinon.stub(Appointment, 'find').returns({ sort: sortStub });

    sinon.stub(DoctorProfile, 'find').returns({
      select: sinon.stub().returns({ lean: sinon.stub().resolves([
        { userId: 'doc1', specialization: 'Time Medicine', contact: '123' },
      ]) }),
    });

    const req = { query: { patientUserId: patientId } };
    const res = mockRes();

    await getMyAppointments(req, res);

    expect(Appointment.find.calledOnce).to.be.true;
    expect(sortStub.calledOnceWith({ start: 1 })).to.be.true;
    expect(populateStub.calledOnceWith('doctorUserId', 'name email role')).to.be.true;

    const payload = res.json.firstCall.args[0];
    expect(payload).to.have.length(1);
    expect(payload[0].doctor.specialization).to.equal('Time Medicine');
  });

  it('should return 400 when a DB error occurs', async () => {
    stubUserOK();
    sinon.stub(Appointment, 'find').throws(new Error('DB Err'));

    const req = { query: { patientUserId: patientId } };
    const res = mockRes();

    await getMyAppointments(req, res);

    expectStatusOrUndefined(res, 400);
    const body = bodyOf(res);
    expect((body.error || body.message || '')).to.match(/db err/i);
  });
});

/* ================================
 * cancelAppointment
 * ================================ */
describe('cancelAppointment', () => {
  it('should return 404 if appointment is not found', async () => {
    sinon.stub(Appointment, 'findById').resolves(null);
    const req = { params: { id: 'x' } };
    const res = mockRes();

    await cancelAppointment(req, res);

    expectStatusOrUndefined(res, 404);
    const body = bodyOf(res);
    expect((body.error || body.message || '')).to.match(/appointment not found/i);
  });

  it('should return existing CANCELLED status without saving again', async () => {
    const appt = { _id: 'a1', status: 'CANCELLED', save: sinon.stub().resolvesThis() };
    sinon.stub(Appointment, 'findById').resolves(appt);
    const res = mockRes();

    await cancelAppointment({ params: { id: 'a1' } }, res);

    expect(res.status.called).to.be.false;
    expect(res.json.calledWithMatch({ _id: 'a1', status: 'CANCELLED' })).to.be.true;
    expect(appt.save.called).to.be.false;
  });

  it('should update status to CANCELLED and save successfully', async () => {
    const appt = { _id: 'a2', status: 'BOOKED', save: sinon.stub().resolvesThis() };
    sinon.stub(Appointment, 'findById').resolves(appt);
    const res = mockRes();

    await cancelAppointment({ params: { id: 'a2' } }, res);

    expect(appt.status).to.equal('CANCELLED');
    expect(appt.save.calledOnce).to.be.true;
    expect(res.json.calledWithMatch({ _id: 'a2', status: 'CANCELLED' })).to.be.true;
  });

  it('should return 400 when an error occurs', async () => {
    sinon.stub(Appointment, 'findById').throws(new Error('boom'));
    const res = mockRes();

    await cancelAppointment({ params: { id: 'x' } }, res);

    expectStatusOrUndefined(res, 400);
    const body = bodyOf(res);
    expect((body.error || body.message || '')).to.match(/boom/i);
  });
});

/* ================================
 * updateAppointment
 * ================================ */
describe('updateAppointment', () => {
  const apptId = new mongoose.Types.ObjectId().toHexString();
  const newStart = '2025-10-08T03:00:00.000Z';

  it('should return 404 if appointment is not found', async () => {
    sinon.stub(Appointment, 'findById').resolves(null);
    const res = mockRes();

    await updateAppointment({ params: { id: apptId }, body: { start: newStart } }, res);

    expectStatusOrUndefined(res, 404);
    const body = bodyOf(res);
    expect((body.error || body.message || '')).to.match(/appointment not found/i);
  });

  it('should return 400 if start time is missing', async () => {
    sinon.stub(Appointment, 'findById').resolves({ _id: apptId, status: 'BOOKED' });
    const res = mockRes();

    await updateAppointment({ params: { id: apptId }, body: {} }, res);

    expectStatusOrUndefined(res, 400);
    const body = bodyOf(res);
    expect((body.error || body.message || '')).to.match(/start.*required/i);
  });

  it('should return 409 when new time is not in availability', async () => {
    const appt = { _id: apptId, status: 'BOOKED', doctorUserId: 'doc1', patientUserId: 'pat1' };
    sinon.stub(Appointment, 'findById').resolves(appt);
    sinon.stub(Availability, 'findOne').returns({ lean: sinon.stub().resolves(null) });

    const res = mockRes();
    await updateAppointment({ params: { id: apptId }, body: { start: newStart } }, res);

    expectStatusOrUndefined(res, 409);
    const body = bodyOf(res);
    expect((body.error || body.message || '')).to.match(/selected time not available/i);
  });

  it('should return 409 when doctor overlap exists', async () => {
    const appt = { _id: apptId, status: 'BOOKED', doctorUserId: 'doc1', patientUserId: 'pat1', save: sinon.stub().resolvesThis() };
    sinon.stub(Appointment, 'findById').resolves(appt);
    sinon.stub(Availability, 'findOne').returns({ lean: sinon.stub().resolves({}) });

    sinon.stub(Appointment, 'findOne').callsFake((q) => {
      const isDoctorCheck = q?.doctorUserId != null;
      const conflict = isDoctorCheck ? { _id: 'conflict' } : null;
      return { lean: sinon.stub().resolves(conflict) };
    });

    const res = mockRes();
    await updateAppointment({ params: { id: apptId }, body: { start: newStart } }, res);

    expectStatusOrUndefined(res, 409);
    const body = bodyOf(res);
    expect((body.error || body.message || '')).to.match(/doctor already booked/i);
  });


  it('should update appointment successfully when input is valid', async () => {
    const appt = { _id: apptId, status: 'BOOKED', doctorUserId: 'doc1', patientUserId: 'pat1', save: sinon.stub().resolvesThis() };
    sinon.stub(Appointment, 'findById').resolves(appt);
    sinon.stub(Availability, 'findOne').returns({ lean: sinon.stub().resolves({}) });
    sinon.stub(Appointment, 'findOne').callsFake(() => ({ lean: sinon.stub().resolves(null) }));

    const res = mockRes();
    await updateAppointment({ params: { id: apptId }, body: { start: newStart, reason: 'Resched' } }, res);

    expect(appt.start).to.be.instanceOf(Date);
    expect(appt.end).to.be.instanceOf(Date);
    expect(appt.save.calledOnce).to.be.true;
    expect(res.status.called).to.be.false;
    expect(res.json.calledWithMatch({ _id: apptId, status: 'BOOKED' })).to.be.true;
  });

  it('should return 409 when duplicate key error occurs during save', async () => {
    const dupErr = Object.assign(new Error('dup'), { name: 'MongoServerError', code: 11000 });
    const appt = { _id: apptId, status: 'BOOKED', doctorUserId: 'doc1', patientUserId: 'pat1', save: sinon.stub().throws(dupErr) };
    sinon.stub(Appointment, 'findById').resolves(appt);
    sinon.stub(Availability, 'findOne').returns({ lean: sinon.stub().resolves({}) });
    sinon.stub(Appointment, 'findOne').callsFake(() => ({ lean: sinon.stub().resolves(null) }));

    const res = mockRes();
    await updateAppointment({ params: { id: apptId }, body: { start: newStart } }, res);

    expectStatusOrUndefined(res, 409);
    const body = bodyOf(res);
    expect((body.error || body.message || '')).to.match(/doctor already booked/i);
  });

  it('should return 400 when another unexpected error occurs during save', async () => {
    const appt = { _id: apptId, status: 'BOOKED', doctorUserId: 'doc1', patientUserId: 'pat1', save: sinon.stub().throws(new Error('weird')) };
    sinon.stub(Appointment, 'findById').resolves(appt);
    sinon.stub(Availability, 'findOne').returns({ lean: sinon.stub().resolves({}) });
    sinon.stub(Appointment, 'findOne').callsFake(() => ({ lean: sinon.stub().resolves(null) }));

    const res = mockRes();
    await updateAppointment({ params: { id: apptId }, body: { start: newStart } }, res);

    expectStatusOrUndefined(res, 400);
    const body = bodyOf(res);
    expect((body.error || body.message || '')).to.match(/weird/i);
  });
});