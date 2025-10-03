// test/helpers/makeApp.js
const express = require('express');
const proxyquire = require('proxyquire').noCallThru();

/**
 * Mounts the given router at /api/doctor with auth middleware stubbed.
 * Reads user/role from headers:
 *   - x-test-user -> req.user.sub
 *   - x-test-role -> req.user.role
 */
function makeApp(pathToRouter) {
    const stubs = {
        '../middleware/auth.middleware': {
            authenticate: (req, _res, next) => {
                req.user = {
                    sub: req.headers['x-test-user'] || null,
                    role: req.headers['x-test-role'] || null,
                };
                next();
            },
            requireRole: (expected) => (req, res, next) => {
                if (!req.user?.role || req.user.role !== expected) {
                    return res.status(403).json({ error: 'Forbidden' });
                }
                next();
            },
        },
    };

    const router = proxyquire(pathToRouter, stubs);
    const app = express();
    app.use(express.json());
    app.use('/doctor', router);
    return app;
}

module.exports = { makeApp };
