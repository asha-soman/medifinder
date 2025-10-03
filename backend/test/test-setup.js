// backend/test/test-setup.js (CommonJS, Mocha root hooks)

const chai = require("chai");
const sinon = require("sinon");
const { MongoMemoryServer } = require("mongodb-memory-server");

global.expect = chai.expect;

let mongo;

exports.mochaHooks = {
  async beforeAll() {
    // allow first-time binary download
    if (typeof this.timeout === "function") this.timeout(30000);

    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

    // Start in-memory Mongo only if you actually need it.
    // (If you’re stubbing all DB calls, this still works—just a small overhead.)
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();

    // Set BOTH env var names to avoid drift in app code
    process.env.MONGODB_URI = process.env.MONGODB_URI || uri;
    process.env.MONGO_URI   = process.env.MONGO_URI   || uri;
  },

  // Global safety net: undo any lingering stubs/spies between tests
  afterEach() {
    sinon.restore();
  },

  async afterAll() {
    if (mongo) {
      await mongo.stop();
    }
  },
};
