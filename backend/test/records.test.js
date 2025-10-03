/* eslint-env mocha */
const { expect } = require('chai');
const request = require('supertest');
const sinon = require('sinon');
const mongoose = require('mongoose');

const { makeApp } = require('./helpers/makeApp');
const Appointment = require('../models/appointment.model');
const MedicalRecord = require('../models/medicalRecord.model');

describe('Medical Records', () => {
    let app;
    let doctorId, patientId, apptId;

    beforeEach(() => {
        app = makeApp('../../routes/doctor.records.routes.js');
        doctorId = new mongoose.Types.ObjectId();
        patientId = new mongoose.Types.ObjectId();
        apptId = new mongoose.Types.ObjectId();
    });

    afterEach(() => sinon.restore());

    /* ----------------- GET /records/by-appointment/:id ----------------- */

    it('GET → 404 when appointment does not exist', async () => {
        sinon.stub(Appointment, 'findById').resolves(null);

        await request(app)
            .get(`/records/by-appointment/${apptId}`)
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'doctor')
            .expect(404);
    });

    it('GET → 404 when no record exists', async () => {
        sinon.stub(Appointment, 'findById').resolves({ _id: apptId, doctorUserId: doctorId });
        sinon.stub(MedicalRecord, 'findOne').resolves(null);

        await request(app)
            .get(`/records/by-appointment/${apptId}`)
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'doctor')
            .expect(404);
    });

    /* ----------------- POST /records ----------------- */

    it('POST → 404 when appointment does not exist', async () => {
        sinon.stub(Appointment, 'findById').resolves(null);

        await request(app)
            .post('/records')
            .set('x-test-user', String(doctorId))
            .set('x-test-role', 'doctor')
            .send({ appointmentId: apptId })
            .expect(404);
    });

});
