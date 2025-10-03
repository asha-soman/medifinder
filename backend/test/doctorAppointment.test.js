/* eslint-env mocha */
const { expect } = require('chai');
const request = require('supertest');
const sinon = require('sinon');
const mongoose = require('mongoose');

// mounts the router at /api/doctor; fakes auth & role via headers
const { makeApp } = require('./helpers/makeApp');

// Model we will stub
const Appointment = require('../models/appointment.model');

describe('Doctor Appointments', () => {
    let app;
    let consoleErrStub;

    beforeEach(() => {
        app = makeApp('../../routes/doctor.appointments.routes.js');
        consoleErrStub = sinon.stub(console, 'error'); // silence route error logs
    });

    afterEach(() => {
        consoleErrStub.restore();
        sinon.restore();
    });

    const DAY = '2025-12-12'; // YYYY-MM-DD
    const start = new Date(Date.UTC(2025, 11, 12, 9, 0));
    const end = new Date(Date.UTC(2025, 11, 12, 10, 0));

    /* ------------------------- GET /appointments ------------------------- */

    it('GET /appointments -> 400 when date missing', async () => {
        await request(app)
            .get('/doctor/appointments')
            .set('x-test-user', 'DOCID')
            .set('x-test-role', 'doctor')
            .expect(400);
    });

    it('GET /appointments -> 400 when date invalid', async () => {
        await request(app)
            .get('/doctor/appointments?date=not-a-date')
            .set('x-test-user', 'DOCID')
            .set('x-test-role', 'doctor')
            .expect(400);
    });

    it('GET /appointments -> 403 when role !== doctor', async () => {
        await request(app)
            .get(`/doctor/appointments?date=${DAY}`)
            .set('x-test-user', 'DOCID')
            .set('x-test-role', 'patient')
            .expect(403);
    });

    it('GET /appointments -> 200 returns mapped list for this doctor+day', async () => {
        const doctorUserId = new mongoose.Types.ObjectId();
        const patientId = new mongoose.Types.ObjectId();

        const rows = [{
            _id: new mongoose.Types.ObjectId(),
            doctorUserId,
            patientUserId: { _id: patientId, name: 'Alice Smith', email: 'alice@example.com' },
            start, end, reason: 'Checkup', status: 'BOOKED'
        }];

        // Stub find().populate().sort().lean() chain
        const lean = sinon.stub().resolves(rows);
        const sort = sinon.stub().returns({ lean });
        const populate = sinon.stub().returns({ sort });

        sinon.stub(Appointment, 'find').callsFake((q) => {
            // The router should filter by doctorUserId and a start range
            expect(q).to.have.property('doctorUserId');       // value equals header user id
            expect(q).to.have.property('start');
            expect(q.start).to.have.keys('$gte', '$lte');
            return { populate };
        });

        const res = await request(app)
            .get(`/doctor/appointments?date=${DAY}`)
            .set('x-test-user', String(doctorUserId))
            .set('x-test-role', 'doctor')
            .expect(200);

        expect(Appointment.find.calledOnce).to.be.true;
        expect(populate.calledWith('patientUserId', 'name email')).to.be.true;
        expect(sort.calledWith({ start: 1 })).to.be.true;

        expect(res.body).to.be.an('array').with.length(1);
        const item = res.body[0];
        expect(item).to.include.keys('id', 'patient', 'start', 'end', 'reason', 'status');
        expect(item.patient).to.deep.include({ name: 'Alice Smith', email: 'alice@example.com' });
    });

    it('GET /appointments -> 500 when model throws', async () => {
        sinon.stub(Appointment, 'find').throws(new Error('DB down'));
        await request(app)
            .get(`/doctor/appointments?date=${DAY}`)
            .set('x-test-user', 'DOCID')
            .set('x-test-role', 'doctor')
            .expect(500);
    });

    /* ----------------- PATCH /appointments/:id/status -------------------- */

    it('PATCH /appointments/:id/status -> 400 for invalid status', async () => {
        const docId = new mongoose.Types.ObjectId();
        const apptId = new mongoose.Types.ObjectId();

        // Won’t be reached (early 400), but stub to be safe
        sinon.stub(Appointment, 'findOne').resolves({ _id: apptId, doctorUserId: docId, save: sinon.stub() });

        await request(app)
            .patch(`/doctor/appointments/${apptId}/status`)
            .set('x-test-user', String(docId))
            .set('x-test-role', 'doctor')
            .send({ status: 'NOPE' })
            .expect(400);
    });

    it('PATCH /appointments/:id/status -> 403 when role !== doctor', async () => {
        await request(app)
            .patch(`/doctor/appointments/${new mongoose.Types.ObjectId()}/status`)
            .set('x-test-user', 'DOCID')
            .set('x-test-role', 'patient')
            .send({ status: 'COMPLETED' })
            .expect(403);
    });

    it('PATCH /appointments/:id/status -> 404 when not found/owned', async () => {
        const docId = new mongoose.Types.ObjectId();
        sinon.stub(Appointment, 'findOne').resolves(null);

        await request(app)
            .patch(`/doctor/appointments/${new mongoose.Types.ObjectId()}/status`)
            .set('x-test-user', String(docId))
            .set('x-test-role', 'doctor')
            .send({ status: 'CANCELLED' })
            .expect(404);
    });

    it('PATCH /appointments/:id/status -> 200 updates status to COMPLETED', async () => {
        const docId = new mongoose.Types.ObjectId();
        const apptId = new mongoose.Types.ObjectId();
        const save = sinon.stub().resolvesThis();
        const appt = { _id: apptId, doctorUserId: docId, status: 'BOOKED', save };

        sinon.stub(Appointment, 'findOne').resolves(appt);

        const res = await request(app)
            .patch(`/doctor/appointments/${apptId}/status`)
            .set('x-test-user', String(docId))
            .set('x-test-role', 'doctor')
            .send({ status: 'COMPLETED' })
            .expect(200);

        expect(appt.status).to.equal('COMPLETED');
        expect(save.calledOnce).to.be.true;
        expect(res.body).to.deep.equal({ id: String(apptId), status: 'COMPLETED' });
    });

    it('PATCH /appointments/:id/status -> 500 when save throws', async () => {
        const docId = new mongoose.Types.ObjectId();
        const apptId = new mongoose.Types.ObjectId();
        const save = sinon.stub().throws(new Error('write failed'));
        const appt = { _id: apptId, doctorUserId: docId, status: 'BOOKED', save };

        sinon.stub(Appointment, 'findOne').resolves(appt);

        await request(app)
            .patch(`/doctor/appointments/${apptId}/status`)
            .set('x-test-user', String(docId))
            .set('x-test-role', 'doctor')
            .send({ status: 'CANCELLED' })
            .expect(500);
    });
});
