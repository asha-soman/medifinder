// test/booking.spec.js
const { expect } = require('chai');
const request = require('supertest');

const { startInMemoryMongo, stopInMemoryMongo, cleanup } = require('./helpers/db');
const { buildApp } = require('./helpers/testApp');
const { seedBasicData } = require('./helpers/fixtures');

const Appointment = require('../..//backend/models/appointment.model');

describe('Booking flow', function () {
  this.timeout(20000);

  let app;
  let ctx;

  before(async () => {
    await startInMemoryMongo();
    app = buildApp();
  });

  after(async () => {
    await stopInMemoryMongo();
  });

  beforeEach(async () => {
    await cleanup();
    ctx = await seedBasicData();

    // Make the test runner "logged in" as the patient
    global.__TEST_AUTH_USER__ = {
      _id: ctx.patient._id,
      role: 'patient'
    };
  });

  it('search doctors without date returns doctors (paginated, empty slots)', async () => {
    const res = await request(app)
      .get('/api/booking/search')
      .query({ name: 'Dr', page: 1, limit: 5 })
      .expect(200);

    expect(res.body).to.have.keys(['page', 'limit', 'total', 'pages', 'items']);
    expect(res.body.items).to.have.length(1);
    expect(res.body.items[0]).to.include.keys(['doctorId', 'doctorName', 'specialization']);
    expect(res.body.items[0].availableSlots).to.deep.equal([]);
  });

  it('search doctors with date returns available slots', async () => {
    const res = await request(app)
      .get('/api/booking/search')
      .query({
        name: 'Dr',
        specialty: 'Cardiology', // frontend key; backend maps to specialization
        date: ctx.dayStr,
        page: 1,
        limit: 5
      })
      .expect(200);

    const doc = res.body.items[0];
    expect(doc.availableSlots.length).to.be.greaterThan(0);
  });

  it('book an appointment on a free slot (success)', async () => {
    const res = await request(app)
      .post('/api/booking/book')
      .send({
        // patientId comes from auth in controller
        doctorId: ctx.doctorUser._id.toString(),
        start: ctx.slot10, // 10:00
        reason: 'Chest pain'
      })
      .expect(201);

    expect(res.body).to.have.keys(['_id', 'status']);
    expect(res.body.status).to.equal('BOOKED');

    const appt = await Appointment.findById(res.body._id).lean();
    expect(appt).to.exist;
    expect(appt.doctorId.toString()).to.equal(ctx.doctorUser._id.toString());
    expect(appt.patientId.toString()).to.equal(ctx.patient._id.toString());
  });

  it('prevents double-booking the same hour for the doctor', async () => {
    // first booking at 09:00
    await request(app)
      .post('/api/booking/book')
      .send({ doctorId: ctx.doctorUser._id.toString(), start: ctx.slot9 })
      .expect(201);

    // second booking at 09:00 should fail
    const res2 = await request(app)
      .post('/api/booking/book')
      .send({ doctorId: ctx.doctorUser._id.toString(), start: ctx.slot9 })
      .expect(409);

    expect(res2.body.error).to.match(/Doctor already booked/i);
  });

  it('get my upcoming appointments', async () => {
    // book one
    await request(app)
      .post('/api/booking/book')
      .send({ doctorId: ctx.doctorUser._id.toString(), start: ctx.slot11 })
      .expect(201);

    // list
    const res = await request(app)
      .get('/api/booking/my')
      .expect(200);

    expect(res.body).to.be.an('array');
    expect(res.body.length).to.equal(1);
    expect(res.body[0]).to.have.keys(['_id', 'start', 'end', 'status', 'doctor']);
    expect(res.body[0].doctor.doctorName).to.equal('Dr. Heart');
    expect(res.body[0].doctor.specialization).to.equal('Cardiology');
  });

  it('edit (reschedule) an appointment to another free slot', async () => {
    // book at 09:00
    const booked = await request(app)
      .post('/api/booking/book')
      .send({ doctorId: ctx.doctorUser._id.toString(), start: ctx.slot9 })
      .expect(201);

    // move to 10:00
    await request(app)
      .patch(`/api/booking/appointments/${booked.body._id}`)
      .send({ start: ctx.slot10, reason: 'Need later time' })
      .expect(200);

    const appt = await Appointment.findById(booked.body._id).lean();
    expect(new Date(appt.start).toISOString()).to.equal(ctx.slot10);
  });

  it('cancel an appointment', async () => {
    const booked = await request(app)
      .post('/api/booking/book')
      .send({ doctorId: ctx.doctorUser._id.toString(), start: ctx.slot9 })
      .expect(201);

    const res = await request(app)
      .patch(`/api/booking/appointments/${booked.body._id}/cancel`)
      .expect(200);

    expect(res.body.status).to.equal('CANCELLED');
  });
});
