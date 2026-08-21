const {describe, it} = require("node:test");
const assert = require("node:assert/strict");
const {auditContext} = require("../index.js");

describe("auditContext", () => {
  it("builds accountId and userId from the request", () => {
    assert.deepEqual(auditContext({
      account: {accountId: "acct-1"},
      user: {_id: "user-1"}
    }), {
      accountId: "acct-1",
      userId: "user-1"
    });
  });

  it("omits folder when it is not provided or empty", () => {
    const req = {
      account: {accountId: "acct-1"},
      user: {_id: "user-1"}
    };
    assert.deepEqual(auditContext(req), {
      accountId: "acct-1",
      userId: "user-1"
    });
    assert.deepEqual(auditContext(req, ""), {
      accountId: "acct-1",
      userId: "user-1"
    });
    assert.deepEqual(auditContext(req, null), {
      accountId: "acct-1",
      userId: "user-1"
    });
  });

  it("includes folder when it is a non-empty string", () => {
    assert.deepEqual(auditContext({
      account: {accountId: "acct-1"},
      user: {_id: "user-1"}
    }, "email-settings"), {
      accountId: "acct-1",
      userId: "user-1",
      folder: "email-settings"
    });
  });

  it("uses user.accountId then account._id when account.accountId is missing", () => {
    assert.equal(auditContext({
      account: {},
      user: {accountId: "from-user", _id: "user-1"}
    }).accountId, "from-user");
    assert.equal(auditContext({
      account: {_id: "acct-id"},
      user: {_id: "user-1"}
    }).accountId, "acct-id");
  });

  it("reads the actor from user.id or user.userId", () => {
    assert.equal(auditContext({
      account: {accountId: "acct-1"},
      user: {id: "id-1"}
    }).userId, "id-1");
    assert.equal(auditContext({
      account: {accountId: "acct-1"},
      user: {userId: "userId-1"}
    }).userId, "userId-1");
  });

  it("falls back userId to accountId when the request has no user", () => {
    assert.deepEqual(auditContext({
      account: {accountId: "acct-1"}
    }), {
      accountId: "acct-1",
      userId: "acct-1"
    });
  });
});
