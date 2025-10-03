const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();

describe("Auth service", () => {
  let stubs;
  let auth;

  async function expectReject(promise, messageRegex) {
    try {
      await promise;
      throw new Error("Expected rejection");
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      if (messageRegex) expect(String(err.message)).to.match(messageRegex);
    }
  }

  beforeEach(() => {
    process.env.JWT_SECRET = "unit-secret";

    stubs = {
      bcrypt: { genSalt: sinon.stub(), hash: sinon.stub(), compare: sinon.stub() },
      jwt: { sign: sinon.stub() },
      userModel: {
        UserModel: {
          findOne: sinon.stub(),
          create: sinon.stub(),
        },
      },
      userFactory: { createUser: sinon.stub() },
    };

    auth = proxyquire("../services/auth.service", {
      bcrypt: stubs.bcrypt,
      jsonwebtoken: stubs.jwt,
      "../models/user.model": stubs.userModel,
      "../shared/factories/user.factory": stubs.userFactory,
    });
  });

  afterEach(() => sinon.restore());

  /* -------------------------------------------------------
   * SIGNUP
   * ----------------------------------------------------- */

  it("signup() - creates a new user and returns JWT", async () => {
    const payload = { name: "  Pat  ", email: "Pat@Example.com", role: "patient", password: "secret12" };

    stubs.userModel.UserModel.findOne.returns({ lean: () => Promise.resolve(null) });

    stubs.userFactory.createUser.returns({
      name: "Pat",
      email: "pat@example.com",
      role: "patient",
    });

    stubs.bcrypt.genSalt.resolves("salt");
    stubs.bcrypt.hash.resolves("hashed-pw");

    stubs.userModel.UserModel.create.resolves({
      _id: { toString: () => "user123" },
      name: "Pat",
      email: "pat@example.com",
      role: "patient",
    });

    stubs.jwt.sign.returns("jwt.token");

    const res = await auth.signup(payload);

    sinon.assert.calledWithMatch(stubs.userModel.UserModel.findOne, { email: "pat@example.com" });

    sinon.assert.calledWithMatch(stubs.userFactory.createUser, {
      name: "Pat",
      email: "pat@example.com",
      role: "patient",
    });

    sinon.assert.calledWithExactly(stubs.bcrypt.genSalt, 10);
    sinon.assert.calledWithExactly(stubs.bcrypt.hash, "secret12", "salt");
    sinon.assert.calledWithMatch(stubs.userModel.UserModel.create, {
      name: "Pat",
      email: "pat@example.com",
      role: "patient",
      passwordHash: "hashed-pw",
    });

    sinon.assert.calledWithExactly(
      stubs.jwt.sign,
      { sub: "user123", role: "patient" },
      "unit-secret",
      { expiresIn: "7d" }
    );

    expect(res).to.deep.equal({
      user: { id: "user123", name: "Pat", email: "pat@example.com", role: "patient" },
      token: "jwt.token",
    });
  });

  it("signup() - rejects duplicate email", async () => {
    const payload = { name: "Pat", email: "pat@example.com", role: "patient", password: "secret12" };

    stubs.userModel.UserModel.findOne.returns({ lean: () => Promise.resolve({ _id: "exists" }) });

    await expectReject(auth.signup(payload), /already registered|exist/i);

    sinon.assert.notCalled(stubs.userModel.UserModel.create);
  });

  it("signup() - validates input and throws for bad email", async () => {
    await expectReject(
      auth.signup({ name: "Pat", email: "bad", role: "patient", password: "secret12" }),
      /invalid email/i
    );
    sinon.assert.notCalled(stubs.userModel.UserModel.findOne);
  });

  it("signup() - throws on invalid role", async () => {
    await expectReject(
      auth.signup({ name: "Pat", email: "pat@example.com", role: "admin", password: "secret12" }),
      /invalid role/i
    );
  });

  it("signup() - throws on short password", async () => {
    await expectReject(
      auth.signup({ name: "Pat", email: "pat@example.com", role: "patient", password: "123" }),
      /password must be/i
    );
  });

  it("signup() - throws on short name", async () => {
    await expectReject(
      auth.signup({ name: "A", email: "pat@example.com", role: "patient", password: "secret12" }),
      /at least 2/i
    );
  });

  /* -------------------------------------------------------
   * LOGIN
   * ----------------------------------------------------- */

  it("login() - returns JWT on valid credentials", async () => {
    const emailInput = "Pat@Example.com"; // should be lowercased for query
    const doc = {
      _id: { toString: () => "user123" },
      name: "Pat",
      email: "pat@example.com",
      role: "patient",
      passwordHash: "hashed-pw",
      locked: false,
    };

    const select = sinon.stub().callsFake((s) => {
      expect(s).to.equal("+passwordHash +locked");
      return { lean: () => Promise.resolve(doc) };
    });
    stubs.userModel.UserModel.findOne.callsFake((q) => {
      expect(q).to.deep.equal({ email: "pat@example.com" });
      return { select };
    });

    stubs.bcrypt.compare.resolves(true);
    stubs.jwt.sign.returns("jwt.token");

    const res = await auth.login({ email: emailInput, password: "secret12" });

    sinon.assert.calledOnce(stubs.userModel.UserModel.findOne);
    sinon.assert.calledOnce(stubs.bcrypt.compare);
    sinon.assert.calledWithExactly(
      stubs.jwt.sign,
      { sub: "user123", role: "patient" },
      "unit-secret",
      { expiresIn: "7d" }
    );

    expect(res).to.deep.equal({
      user: { id: "user123", name: "Pat", email: "pat@example.com", role: "patient" },
      token: "jwt.token",
    });
  });

  it("login() - fails on wrong password", async () => {
    const doc = {
      _id: { toString: () => "user123" },
      name: "Pat",
      email: "pat@example.com",
      role: "patient",
      passwordHash: "hashed-pw",
      locked: false,
    };

    stubs.userModel.UserModel.findOne.returns({
      select: () => ({ lean: () => Promise.resolve(doc) }),
    });
    stubs.bcrypt.compare.resolves(false);

    await expectReject(
      auth.login({ email: "pat@example.com", password: "wrong" }),
      /invalid credentials|password/i
    );
  });

  it("login() - rejects locked accounts", async () => {
    const lockedDoc = {
      _id: { toString: () => "user123" },
      name: "Pat",
      email: "pat@example.com",
      role: "patient",
      passwordHash: "hashed-pw",
      locked: true,
    };

    stubs.userModel.UserModel.findOne.returns({
      select: () => ({ lean: () => Promise.resolve(lockedDoc) }),
    });

    try {
      await auth.login({ email: "pat@example.com", password: "whatever" });
      throw new Error("should not reach");
    } catch (err) {
      expect(String(err.message)).to.match(/locked/i);
      expect(err).to.have.property("code", "LOCKED");
    }
  });

  it("login() - invalid email format is rejected before DB", async () => {
    await expectReject(auth.login({ email: "bad@", password: "x" }), /invalid email/i);
    sinon.assert.notCalled(stubs.userModel.UserModel.findOne);
  });

  it("login() - missing password rejected", async () => {
    await expectReject(auth.login({ email: "pat@example.com" }), /password required/i);
    sinon.assert.notCalled(stubs.userModel.UserModel.findOne);
  });

  it("login() - user not found", async () => {
    stubs.userModel.UserModel.findOne.returns({
      select: () => ({ lean: () => Promise.resolve(null) }),
    });

    await expectReject(auth.login({ email: "pat@example.com", password: "secret12" }), /invalid credentials/i);
    sinon.assert.notCalled(stubs.bcrypt.compare);
  });
});
