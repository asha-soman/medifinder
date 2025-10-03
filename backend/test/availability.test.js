/* eslint-env mocha */
const { expect } = require('chai');
const request = require('supertest');
const sinon = require('sinon');
const mongoose = require('mongoose');

const { makeApp } = require('./helpers/makeApp');
const Availability = require('../models/availability.model');

// We will spy on the observer’s emit
const { availabilityObserver } = require('../shared/observers/availability.observer');

describe('Doctor Availability', () => {
    let app;
    let consoleErrStub;

    beforeEach(() => {
        app = makeApp('../../routes/doctor.availability.routes.js');
        // silence console.error in tests that intentionally error
        consoleErrStub = sinon.stub(console, 'error');
    });

    afterEach(() => {
        sinon.restore();
        consoleErrStub.restore();
    });

    const DAY = '2025-12-12'; // YYYY-MM-DD
    const doctorId = new mongoose.Types.ObjectId();

    // 09:00–11:00 UTC on the same day
    const start = new Date(Date.UTC(2025, 11, 12, 9, 0));
    const end = new Date(Date.UTC(2025, 11, 12, 11, 0));

    /* ------------------ GET /availability ------------------ */

    it('GET /availability → 403 when role !== doctor', async () => {
        await request(app)
            .get(`/doctor/availability?date=${DAY}`)
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'patient')
            .expect(403);
    });

    it('GET /availability → 400 when date missing', async () => {
        await request(app)
            .get('/doctor/availability')
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'doctor')
            .expect(400);
    });

    it('GET /availability → 400 when date invalid', async () => {
        await request(app)
            .get('/doctor/availability?date=not-a-date')
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'doctor')
            .expect(400);
    });

    it('GET /availability → 200 returns DTO (via facade using Availability.find)', async () => {
        // Stub the Availability.find(...).sort(...).lean() chain the facade will call
        const rows = [{
            _id: new mongoose.Types.ObjectId(),
            doctorUserId: doctorId,
            date: new Date(Date.UTC(2025, 11, 12, 0, 0)),
            startTime: start,
            endTime: end,
            isBlocked: false,
        }];

        const lean = sinon.stub().resolves(rows);
        const sort = sinon.stub().returns({ lean });
        sinon.stub(Availability, 'find').returns({ sort });

        const res = await request(app)
            .get(`/doctor/availability?date=${DAY}`)
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'doctor')
            .expect(200);

        // The facade builds { date, blocks:[…], totals:{windows:n} }
        expect(res.body).to.have.keys(['date', 'blocks', 'totals']);
        expect(res.body.blocks).to.be.an('array').with.length(1);
        expect(res.body.blocks[0]).to.include.keys('id', 'startTime', 'endTime', 'isBlocked');
    });

    it('GET /availability → 400 when model/facade throws', async () => {
        sinon.stub(Availability, 'find').throws(new Error('DB down'));
        await request(app)
            .get(`/doctor/availability?date=${DAY}`)
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'doctor')
            .expect(400);
    });

    /* ------------------ POST /availability ------------------ */

    it('POST /availability → 403 when role !== doctor', async () => {
        await request(app)
            .post('/doctor/availability')
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'patient')
            .send({
                date: new Date(Date.UTC(2025, 11, 12, 0, 0)).toISOString(),
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                isBlocked: false,
            })
            .expect(403);
    });

    it('POST /availability → 400 when required fields missing (validator)', async () => {
        await request(app)
            .post('/doctor/availability')
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'doctor')
            .send({}) // missing date/startTime/endTime
            .expect(400);
    });

    it('POST /availability → 400 when startTime >= endTime (validator)', async () => {
        await request(app)
            .post('/doctor/availability')
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'doctor')
            .send({
                date: new Date(Date.UTC(2025, 11, 12, 0, 0)).toISOString(),
                startTime: end.toISOString(),
                endTime: start.toISOString(),
                isBlocked: false,
            })
            .expect(400);
    });

    it('POST /availability → 201 creates and emits availability.changed', async () => {
        const created = {
            _id: new mongoose.Types.ObjectId(),
            doctorUserId: doctorId,
            date: new Date(Date.UTC(2025, 11, 12, 0, 0)),
            startTime: start,
            endTime: end,
            isBlocked: false,
        };

        const createStub = sinon.stub(Availability, 'create').resolves(created);
        const emitStub = sinon.stub(availabilityObserver, 'emit');

        const res = await request(app)
            .post('/doctor/availability')
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'doctor')
            .send({
                date: created.date.toISOString(),
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                isBlocked: false,
            })
            .expect(201);

        expect(createStub.calledOnce).to.be.true;
        expect(res.body).to.include({
            isBlocked: false,
        });
        expect(String(res.body._id)).to.equal(String(created._id));

        sinon.assert.calledWithMatch(emitStub, 'availability.changed', {
            type: 'added',
            doctorUserId: String(doctorId),
            id: String(created._id),
        });
    });

    it('POST /availability → 400 when create throws', async () => {
        sinon.stub(Availability, 'create').throws(new Error('write failed'));
        await request(app)
            .post('/doctor/availability')
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'doctor')
            .send({
                date: new Date(Date.UTC(2025, 11, 12, 0, 0)).toISOString(),
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                isBlocked: false,
            })
            .expect(400);
    });

    /* ------------------ PATCH /availability/:id ------------------ */

    it('PATCH /availability/:id → 404 when not found', async () => {
        sinon.stub(Availability, 'findById').resolves(null);

        await request(app)
            .patch(`/doctor/availability/${new mongoose.Types.ObjectId()}`)
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'doctor')
            .send({ isBlocked: true })
            .expect(404);
    });

    it('PATCH /availability/:id → 403 when slot owned by another doctor', async () => {
        const otherDoc = new mongoose.Types.ObjectId();
        const fake = { _id: new mongoose.Types.ObjectId(), doctorUserId: otherDoc };
        sinon.stub(Availability, 'findById').resolves(fake);

        await request(app)
            .patch(`/doctor/availability/${fake._id}`)
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'doctor')
            .send({ isBlocked: true })
            .expect(403);
    });

    it('PATCH /availability/:id → 400 when validator rejects time order', async () => {
        const id = new mongoose.Types.ObjectId();
        const doc = {
            _id: id,
            doctorUserId: doctorId,
            date: new Date(Date.UTC(2025, 11, 12, 0, 0)),
            startTime: start,
            endTime: end,
        };
        sinon.stub(Availability, 'findById').resolves(doc);

        await request(app)
            .patch(`/doctor/availability/${id}`)
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'doctor')
            .send({
                startTime: end.toISOString(),  // flip order
                endTime: start.toISOString(),
            })
            .expect(400);
    });

    it('PATCH /availability/:id → 200 updates fields and emits availability.changed', async () => {
        const id = new mongoose.Types.ObjectId();
        const save = sinon.stub().resolvesThis();
        const doc = {
            _id: id,
            doctorUserId: doctorId,
            date: new Date(Date.UTC(2025, 11, 12, 0, 0)),
            startTime: start,
            endTime: end,
            isBlocked: false,
            save,
        };
        sinon.stub(Availability, 'findById').resolves(doc);
        const emitStub = sinon.stub(availabilityObserver, 'emit');

        const res = await request(app)
            .patch(`/doctor/availability/${id}`)
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'doctor')
            .send({ isBlocked: true })
            .expect(200);

        expect(save.calledOnce).to.be.true;
        expect(res.body).to.include({ isBlocked: true });

        sinon.assert.calledWithMatch(emitStub, 'availability.changed', {
            type: 'updated',
            doctorUserId: String(doctorId),
            id: String(id),
        });
    });

    it('PATCH /availability/:id → 400 when save throws', async () => {
        const id = new mongoose.Types.ObjectId();
        const save = sinon.stub().throws(new Error('db write'));
        const doc = {
            _id: id,
            doctorUserId: doctorId,
            date: new Date(Date.UTC(2025, 11, 12, 0, 0)),
            startTime: start,
            endTime: end,
            isBlocked: false,
            save,
        };
        sinon.stub(Availability, 'findById').resolves(doc);

        await request(app)
            .patch(`/doctor/availability/${id}`)
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'doctor')
            .send({ isBlocked: true })
            .expect(400);
    });

    /* ------------------ DELETE /availability/:id ------------------ */

    it('DELETE /availability/:id → 404 when not found', async () => {
        sinon.stub(Availability, 'findById').resolves(null);

        await request(app)
            .delete(`/doctor/availability/${new mongoose.Types.ObjectId()}`)
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'doctor')
            .expect(404);
    });

    it('DELETE /availability/:id → 403 when slot owned by another doctor', async () => {
        const slot = {
            _id: new mongoose.Types.ObjectId(),
            doctorUserId: new mongoose.Types.ObjectId(),
        };
        sinon.stub(Availability, 'findById').resolves(slot);

        await request(app)
            .delete(`/doctor/availability/${slot._id}`)
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'doctor')
            .expect(403);
    });

    it('DELETE /availability/:id → 204 and emits availability.changed', async () => {
        const id = new mongoose.Types.ObjectId();
        const del = sinon.stub().resolves();
        const slot = { _id: id, doctorUserId: doctorId, date: new Date(), deleteOne: del };
        sinon.stub(Availability, 'findById').resolves(slot);

        const emitStub = sinon.stub(availabilityObserver, 'emit');

        await request(app)
            .delete(`/doctor/availability/${id}`)
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'doctor')
            .expect(204);

        expect(del.calledOnce).to.be.true;
        sinon.assert.calledWithMatch(emitStub, 'availability.changed', {
            type: 'deleted',
            doctorUserId: String(doctorId),
            id: String(id),
        });
    });

    it('DELETE /availability/:id → 400 when deleteOne throws', async () => {
        const id = new mongoose.Types.ObjectId();
        const slot = { _id: id, doctorUserId: doctorId, deleteOne: sinon.stub().throws(new Error('oops')) };
        sinon.stub(Availability, 'findById').resolves(slot);

        await request(app)
            .delete(`/doctor/availability/${id}`)
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'doctor')
            .expect(400);
    });
});
