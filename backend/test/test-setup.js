// backend/test/test-setup.js

const chai = require("chai");
const sinon = require("sinon");

global.expect = chai.expect;

let mongo; 

exports.mochaHooks = {
  async beforeAll() {
    if (typeof this.timeout === "function") this.timeout(30000);

    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
    if (process.env.USE_MEMORY_DB === "1") {
      try {
        const { MongoMemoryServer } = require("mongodb-memory-server");
        mongo = await MongoMemoryServer.create();
        const uri = mongo.getUri();

        process.env.MONGODB_URI = process.env.MONGODB_URI || uri;
        process.env.MONGO_URI   = process.env.MONGO_URI   || uri;
      } catch (err) {
      }
    }
  },

  afterEach() {
    sinon.restore();
  },

  async afterAll() {
    if (mongo) {
      await mongo.stop();
    }
  },
};
