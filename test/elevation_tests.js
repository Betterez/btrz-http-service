describe("userPermissionElevation", () => {
  const expect = require("chai").expect;
  const {userPermissionElevation} = require("../index.js");
  const {redirectToElevatePermissions} = userPermissionElevation;
  const {base64UrlEncode} = userPermissionElevation;
  const {getElevationToken} = userPermissionElevation;
  const {markElevationTokenAsUsed} = userPermissionElevation;
  const jwt = require("jsonwebtoken");
  const {JWT_SECRET} = userPermissionElevation;
  let req = {};
  let res = {};
  let action = {};
  beforeEach(() => {
    action = {
      action: "test",
      redirectUrl: "/elevate"
    };
    req = {
      user: {_id: "123444"},
      session: {}
    };
    res = {};
  });

  describe("#getElevationToken()", () => {
    it("should return the elevation token", () => {
      const result = getElevationToken(req.user, action);
      expect(result).to.equal(jwt.sign({user: req.user, action}, JWT_SECRET, {expiresIn: "30m" }));
    });
  });

  describe("#base64UrlEncode()", () => {
    it("should encode the action in base64 url format", () => {
      const result = base64UrlEncode(action);
      expect(result).to.equal(encodeURIComponent(Buffer.from(JSON.stringify(action)).toString('base64')));
    });
  });

  describe("#needsToElevatePermissions()", () => {
    it("Given a delegate that returns true and the elevationToken is not present it should redirect to the redirect URL with the action encoded in the redirect URL", (done) => {
      function delegate() {
        return true;
      }
      res.redirect = (url) => {
        expect(url).to.equal(`/elevate?action=${base64UrlEncode(action)}`);
        done();
      };
      redirectToElevatePermissions(req, res, action, delegate);
    });

    it("Given a delegate that returns true and the elevationToken is present but with invalid data it should redirect to the redirect URL with the action encoded in the redirect URL", (done) => {
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
      req.session.elevationToken = getElevationToken({name: "move_ticket", data: {ticketIds: [123, 678]}});
      res.redirect = (url) => {
        expect(url).to.equal(`/elevate?action=${base64UrlEncode(action)}`);
        done();
      };
      redirectToElevatePermissions(req, res, action, delegate);
    });

    it("Given a delegate that returns true and the elevationToken is present but with invalid name it should redirect to the redirect URL with the action encoded in the redirect URL", (done) => {
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
      req.session.elevationToken = getElevationToken({name: "move_ticket2", data: {ticketIds: [123, 456]}});
      res.redirect = (url) => {
        expect(url).to.equal(`/elevate?action=${base64UrlEncode(action)}`);
        done();
      };
      redirectToElevatePermissions(req, res, action, delegate);
    });

    it("Given a delegate that returns true and the elevationToken is present but with invalid signature it should redirect to the redirect URL with the action encoded in the redirect URL", (done) => {
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
      res.redirect = (url) => {
        expect(url).to.equal(`/elevate?action=${base64UrlEncode(action)}`);
        done();
      };
      redirectToElevatePermissions(req, res, action, delegate);
    });
  
    it("should return true if action doesn't have a redirect URL and the delegate returns true and no valid token is present", () => {
      function delegate() {
        return true;
      }
      delete action.redirectUrl;
      const result = redirectToElevatePermissions(req, res, action, delegate);
      expect(result).to.equal(true);
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
      req.session.elevationToken = getElevationToken(req.user, action);
      res.redirect = (url) => {
        expect(url).to.equal(undefined);
        done();
      };
      const result = redirectToElevatePermissions(req, res, action, delegate);
      expect(result).to.equal(false);
    });

    it("should return false if the user does not need to elevate permissions", () => {
      function delegate() {
        return false;
      }
      const result = redirectToElevatePermissions(req, res, action, delegate);
      expect(result).to.equal(false);
    });
  });

  describe("#markElevationTokenAsUsed()", () => {
    it("should mark the elevation token as used", () => {
      req.session.elevationToken = getElevationToken(req.user, action);
      markElevationTokenAsUsed(req, action);
      expect(req.session.elevationToken).to.equal(null);
    });
  });
});