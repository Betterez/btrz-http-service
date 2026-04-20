const {describe, it, beforeEach, afterEach} = require("node:test");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");

describe("userPermissionElevation", () => {
  const jwt = require("jsonwebtoken");
  const sinon = require("sinon");
  const Chance = require("chance");
  const chance = new Chance();
  const {SimpleDao} = require("btrz-simple-dao");
  const {userPermissionElevation} = require("../index.js");
  const {redirectToElevatePermissions} = userPermissionElevation;
  const {base64UrlEncode} = userPermissionElevation;
  const {getElevationToken} = userPermissionElevation;
  const {markElevationTokenAsUsed} = userPermissionElevation;

  let req = {};
  let res = {};
  let logger;
  let action = {};
  let delegator;
  let privateKey;

  beforeEach(() => {
    req = {
      user: {_id: "123444"},
      session: {}
    };
    res = {};
    logger = {
      error: sinon.stub()
    };
    action = {
      action: "test",
      redirectUrl: "/elevate"
    };
    delegator = {
      _id: SimpleDao.objectId(),
      email: chance.email()
    };
    privateKey = crypto.randomBytes(32).toString('hex');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("#getElevationToken()", () => {
    it("should return the elevation token", () => {
      const result = getElevationToken(req.user, privateKey, action, delegator);
      assert.equal(result,
        jwt.sign({user: req.user, action, delegator: {_id: delegator._id.toString()}}, privateKey, {expiresIn: "30m" })
      );
    });
  });

  describe("#base64UrlEncode()", () => {
    it("should encode the action in base64 url format", () => {
      const result = base64UrlEncode(action);
      assert.equal(result, encodeURIComponent(Buffer.from(JSON.stringify(action)).toString('base64')));
    });
  });

  describe("#redirectToElevatePermissions()", () => {
    it("Given a delegate that returns true and the elevationToken is not present it should redirect to the redirect URL with the action encoded in the redirect URL", async () => {
      function delegate() {
        return true;
      }
      await new Promise((resolve) => {
        res.redirect = (url) => {
          assert.equal(url, `/elevate?action=${base64UrlEncode(action)}`);
          resolve();
        };
        redirectToElevatePermissions(req, res, privateKey, action, delegate);
      });
    });

    it("Given a delegate that returns true and the elevationToken is present but with invalid data it should redirect to the redirect URL with the action encoded in the redirect URL", async () => {
      function delegate() {
        return true;
      }
      action = {
        name: "move_ticket",
        requestedUrl: "/tickets/123/move",
        redirectUrl: "/elevate",
        data: {
          ticketIds: [123, 456],
        }
      }
      req.session.elevationToken = getElevationToken({_id: "1234"}, privateKey, {name: "move_ticket", data: {ticketIds: [123, 678]}});
      await new Promise((resolve) => {
        res.redirect = (url) => {
          assert.equal(url, `/elevate?action=${base64UrlEncode(action)}`);
          resolve();
        };
        redirectToElevatePermissions(req, res, privateKey, action, delegate);
      });
    });

    it("Given a delegate that returns true and the elevationToken is present but with invalid name it should redirect to the redirect URL with the action encoded in the redirect URL", async () => {
      function delegate() {
        return true;
      }
      action = {
        name: "move_ticket",
        requestedUrl: "/tickets/123/move",
        redirectUrl: "/elevate",
        data: {
          ticketIds: [123, 456],
        }
      }
      req.session.elevationToken = getElevationToken({_id: "1234"}, privateKey, {name: "move_ticket2", data: {ticketIds: [123, 456]}});
      await new Promise((resolve) => {
        res.redirect = (url) => {
          assert.equal(url, `/elevate?action=${base64UrlEncode(action)}`);
          resolve();
        };
        redirectToElevatePermissions(req, res, privateKey, action, delegate);
      });
    });

    it("Given a delegate that returns true and the elevationToken is present but with invalid signature it should redirect to the redirect URL with the action encoded in the redirect URL", async () => {
      function delegate() {
        return true;
      }
      action = {
        name: "move_ticket",
        requestedUrl: "/tickets/123/move",
        redirectUrl: "/elevate",
        data: {
          ticketIds: [123, 456],
        }
      }
      req.session.elevationToken = jwt.sign({user: req.user, action}, "somthing-not-so-secret-again", {expiresIn: "30m" });
      await new Promise((resolve) => {
        res.redirect = (url) => {
          assert.equal(url, `/elevate?action=${base64UrlEncode(action)}`);
          resolve();
        };
        redirectToElevatePermissions(req, res, privateKey, action, delegate);
      });
    });

    it("should return true if action doesn't have a redirect URL and the delegate returns true and no valid token is present", () => {
      function delegate() {
        return true;
      }
      delete action.redirectUrl;
      const result = redirectToElevatePermissions(req, res, privateKey, action, delegate);
      assert.equal(result, true);
    });

    it("Given a delegate that returns true and the elevationToken is present and valid it should not redirect to the redirect URL with the action encoded in the redirect URL", () => {
      function delegate() {
        return true;
      }
      action = {
        name: "move_ticket",
        requestedUrl: "/tickets/123/move",
        redirectUrl: "/elevate",
        data: {
          ticketIds: [123, 456],
        }
      }
      req.session.elevationToken = getElevationToken(req.user, privateKey, action);
      const result = redirectToElevatePermissions(req, res, privateKey, action, delegate);
      assert.equal(result, false);
    });

    it("should return false when the action data stored in the elevation token and the action data provided as an argument have the same data, but the order of array data is different", () => {
      // It is expected that developers will provide array data in different order.  For example, if the action data contains an array of
      // ticket IDs, they may be added to the action as `ticketIds: [1, 2]` or `ticketIds: [2, 1]`.  When checking if an elevation token is
      // valid for a particular action, we do not want the algorithm to be sensitive to the order of the array data (a token that was issued
      // for `ticketIds: [1, 2]` should be considered valid for `ticketIds: [2, 1]` as well).
      function delegate() {
        return true;
      }

      action = {
        name: "move_ticket",
        redirectUrl: "",
        data: {
          tickets: [{_id: 1}, {_id: 2}],
        }
      }
      req.session.elevationToken = getElevationToken(req.user, privateKey, action);
      let result = redirectToElevatePermissions(req, res, privateKey, action, delegate);
      assert.equal(result, false);

      action.data.tickets = [{_id: 2}, {_id: 1}];
      result = redirectToElevatePermissions(req, res, privateKey, action, delegate);
      assert.equal(result, false);
    });

    it("should return false if the user does not need to elevate permissions", () => {
      function delegate() {
        return false;
      }
      const result = redirectToElevatePermissions(req, res, privateKey, action, delegate);
      assert.equal(result, false);
    });
  });

  describe("#markElevationTokenAsUsed()", () => {
    it("should mark the elevation token as used", () => {
      req.session.elevationToken = getElevationToken(req.user, privateKey, action);
      markElevationTokenAsUsed(req, privateKey, action);
      assert.equal(req.session.elevationToken, null);
    });
  });

  describe("#elevationTokenMiddleware()", () => {
    let userId;
    let elevationTokenMiddleware;
    let next;

    beforeEach(() => {
      userId = SimpleDao.objectId().toString();
      const elevationToken = jwt.sign({user: {_id: userId}, action}, privateKey, {expiresIn: "30m" })
      req = {
        user: {_id: userId},
        headers: {
          "x-elevation-token": elevationToken
        },
        application: {
          privateKey
        },
        elevationToken: null
      };
      elevationTokenMiddleware = userPermissionElevation.elevationTokenMiddleware(logger);
      next = sinon.stub();
    });

    function expectMiddlewareCompletedWithNoErrors() {
      assert.equal(next.calledOnce, true);
      assert.deepEqual(next.firstCall.args, []);
      assert.equal(logger.error.calledOnce, false);
    }

    function expectMiddlewareCompletedWithError(errorMessage) {
      assert.equal(next.calledOnce, true);
      assert.deepEqual(next.firstCall.args, []);
      assert.equal(logger.error.calledOnce, true);
      assert.deepEqual(logger.error.firstCall.args[0], errorMessage);
    }

    it("should set 'req.elevationToken' to null if the request does not have the 'x-elevation-token' header", () => {
      delete req.headers["x-elevation-token"];

      elevationTokenMiddleware(req, res, next);
      assert.equal(req.elevationToken, null);
      expectMiddlewareCompletedWithNoErrors();
    });

    it("should log an error and continue if the private key of the application making the request could not be determined", () => {
      delete req.application;

      elevationTokenMiddleware(req, res, next);
      assert.equal(req.elevationToken, null);
      expectMiddlewareCompletedWithError("Received an 'x-elevation-token', but it cannot be verified because there is " +
        "no private key associated with the current request.  The token will be ignored.");
    });

    it("should log an error and continue if the elevation token is malformed", () => {
      req.headers["x-elevation-token"] = "malformed token";

      elevationTokenMiddleware(req, res, next);
      assert.equal(req.elevationToken, null);
      expectMiddlewareCompletedWithError("Invalid token received in 'x-elevation-token' header");
      const jwtVerifyError = logger.error.firstCall.args[1];
      assert.ok(jwtVerifyError instanceof Error);
      assert.equal(jwtVerifyError.message, "jwt malformed");
    });

    it("should log an error and continue if the elevation token is expired", () => {
      const jwtIssuedAt = Math.floor(new Date("2000-01-01T00:00:00.000Z") / 1000);
      req.headers["x-elevation-token"] = jwt.sign({user: {_id: userId}, action, iat: jwtIssuedAt}, privateKey, {expiresIn: "1s" });

      elevationTokenMiddleware(req, res, next);
      assert.equal(req.elevationToken, null);
      expectMiddlewareCompletedWithError("Invalid token received in 'x-elevation-token' header");
      const jwtVerifyError = logger.error.firstCall.args[1];
      assert.ok(jwtVerifyError instanceof Error);
      assert.equal(jwtVerifyError.message, "jwt expired");
    });

    it("should log an error and continue if the ID of the user making the request could not be determined", () => {
      delete req.user;

      elevationTokenMiddleware(req, res, next);
      assert.equal(req.elevationToken, null);
      expectMiddlewareCompletedWithError("Received an 'x-elevation-token', but there is no user associated with the " +
        "current request.  The token will be ignored.");
    });

    it("should log an error and continue if the elevation token does not declare the user ID that it was issued for", () => {
      req.headers["x-elevation-token"] = jwt.sign({action}, privateKey, {expiresIn: "30m" });

      elevationTokenMiddleware(req, res, next);
      assert.equal(req.elevationToken, null);
      expectMiddlewareCompletedWithError("Received a malformed 'x-elevation-token'.  The token does not contain a user ID.   The token will be ignored.");
    });

    it("should log an error and continue if the elevation token was not issued for the user that is making the request", () => {
      req.user._id = SimpleDao.objectId().toString();

      elevationTokenMiddleware(req, res, next);
      assert.equal(req.elevationToken, null);
      expectMiddlewareCompletedWithError("Received an 'x-elevation-token' which belongs to another user.  The token will be ignored.");
    });

    it("should set 'req.elevationToken' to the decoded value of the elevation token provided in the 'x-elevation-token' header", () => {
      elevationTokenMiddleware(req, res, next);
      assert.deepEqual(req.elevationToken.user, {_id: userId});
      assert.deepEqual(req.elevationToken.action, action);
      expectMiddlewareCompletedWithNoErrors();
    });
  });
});
