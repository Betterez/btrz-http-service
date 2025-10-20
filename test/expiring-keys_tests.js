"use strict";

describe("Middleware", () => {
  const expect = require("chai").expect;
  const sinon = require("sinon");  
  const ExpiringKey = require("../lib/expiring-keys");
  const redis = require("redis").createClient();
  const res = {
    send(code, message) {
      return {code, message};
    },
  };

  let sandbox = null;
  let expiringKey = null;

  describe(".success()", () => {
    beforeEach(() => {
      sandbox = sinon.createSandbox();
      expiringKey = new ExpiringKey(redis);
      res.status = function (code) {
        return {
          send(message) {
            return res.send(code, message);
          },
          end(...args) {
            return res.end(...args);
          },
          json(...args) {
            return res.json(...args);
          }
        };
      };
    });

    afterEach(function () {
      sandbox.restore();
      redis.flushdb();
    })

    it("if no options values passed, should return next()", () => {
      const middleware = expiringKey.middleWare({});
      const result = middleware({}, {}, () => { return "next"});
      expect(result).to.eql("next");
    });

    it("if path value not found, should return next", () => {
      const middleware = expiringKey.middleWare({lookup: "body.paramToFind"});
      const req = {body: {paramToFind: "param"}};
      const result = middleware(req, {}, () => { return "next"});
      expect(result).to.eql("next");
    });

    it("if method value not found, should return next", () => {
      const middleware = expiringKey.middleWare({lookup: "body.paramToFind", "path": "path"});
      const req = {body: {}};
      const result = middleware(req, {}, () => { return "next"});
      expect(result).to.eql("next");
    });

    it("if lookup not found in the request, should return next", () => {
      const middleware = expiringKey.middleWare({lookup: "body.paramToFind", path: "path", method: "method"});
      const req = {body: {}};
      const result = middleware(req, {}, () => { return "next" });
      expect(result).to.eql("next");
    });

    it("if lookup exists, and db returns an error it should return next", () => {
      expiringKey = new ExpiringKey(redis);
      const middleware = expiringKey.middleWare({lookup: "body.paramToFind", path: "path", method: "method"});
      const req = {body: {paramToFind: "foundParam"}};
      const getCall = sandbox.stub(redis, "get").callsFake((key, callback) => {
        callback({err: true});
      });
      const setCall = sandbox.stub(redis, "set").callsFake((key, value, index, expire, callback) => {
        callback();
      });      
      middleware(req, res, () => { 
        expect(getCall.calledOnce).to.eql(true);
        expect(setCall.calledOnce).to.eql(false);
      });
    });

    it("if lookup exists, and db returns a value it should call onKeyFound", async () => {
      expiringKey = new ExpiringKey(redis);
      const middleware = expiringKey.middleWare({lookup: "body.paramToFind", path: "path", method: "method"});
      const req = {body: {paramToFind: "foundParam"}};
      const getCall = sandbox.stub(redis, "get").callsFake((key, callback) => {
        callback(null, "processed");
      });
      const setCall = sandbox.stub(redis, "set").callsFake((key, value, lock, index, expire, callback) => {
        callback();
      });      
      sandbox.spy(res, "send");
      const result = await middleware(req, res, () => { return "next" });

      expect(res.send.returnValues[0].code).to.eql(409);
      expect(res.send.returnValues[0].message).to.eql("A blocking key was found");
      expect(getCall.calledOnce).to.eql(true);
      expect(setCall.calledOnce).to.eql(false);
      expect(res.send.calledOnce).to.eql(true);
    });

    it("if lookup does not exist it should set the value of the uniqueRequestKey", () => {
      expiringKey = new ExpiringKey(redis);
      const middleware = expiringKey.middleWare({lookup: "body.paramToFind", path: "path", method: "method"});
      const req = {body: {paramToFind: "foundParam"}};
      const getCall = sandbox.stub(redis, "get").callsFake((key, callback) => {
        callback();
      });
      const setCall = sandbox.stub(redis, "set").callsFake((key, value, nx, index, expire, callback) => {
        callback(null, 'OK');
      });

      middleware(req, res, () => { 
        expect(getCall.calledOnce).to.eql(true);
        expect(setCall.calledOnce).to.eql(true);
        expect(req.uniqueRequestKey).to.eql("key:path:method:body.paramToFind:foundParam");
      });
    });

    it("if lookup does not exist, and checkForKeyOnly is true it should call next", async () => {
      expiringKey = new ExpiringKey(redis);
      const middleware = expiringKey.middleWare({lookup: "body.paramToFind", path: "path", method: "method", checkForKeyOnly: true});
      const req = {body: {paramToFind: "foundParam"}};
      const getCall = sandbox.stub(redis, "get").callsFake((key, callback) => {
        callback();
      });
      const setCall = sandbox.stub(redis, "set").callsFake((key, value, index, expire, callback) => {
        callback();
      });

      await middleware(req, res, () => { return "next" });
      expect(getCall.calledOnce).to.eql(true);
      expect(setCall.calledOnce).to.eql(false);
      expect(req.uniqueRequestKey).to.be.undefined;
    });

    it("if lookup does not exist, and the lookup format is invalid, and checkForKeyOnly is true it should call next", async () => {
      expiringKey = new ExpiringKey(redis);
      const alternateKeyName = "altBody.altNewKey";
      const middleware = expiringKey.middleWare({lookup: {keysName: "mistake", alternateKeyName}, path: "path", method: "method", checkForKeyOnly: true});
      const req = {body: {paramToFind: "foundParam"}};
      const getCall = sandbox.stub(redis, "get").callsFake((key, callback) => {
        callback();
      });
      const setCall = sandbox.stub(redis, "set").callsFake((key, value, index, expire, callback) => {
        callback();
      });

      await middleware(req, res, () => { return "next" });

      expect(getCall.calledOnce).to.eql(false);
      expect(setCall.calledOnce).to.eql(false);
      expect(req.uniqueRequestKey).to.be.undefined;
    });

    it("if lookup exists, and the lookup keyName has been set, and checkForKeyOnly is true it should call next", async () => {
      expiringKey = new ExpiringKey(redis);
      const keyName = "body.paramToFind";
      const alternateKeyName = "altBody.altNewKey";
      const middleware = expiringKey.middleWare({lookup: {keyName, alternateKeyName}, path: "path", method: "method", checkForKeyOnly: true});
      const req = {body: {paramToFind: "foundParam"}};
      const getCall = sandbox.stub(redis, "get").callsFake((key, callback) => {
        callback();
      });
      const setCall = sandbox.stub(redis, "set").callsFake((key, value, index, expire, callback) => {
        callback();
      });

      await middleware(req, res, () => { return "next" });

      expect(getCall.getCall(0).args[0]).to.eql(`key:path:method:${alternateKeyName}:foundParam`);
      expect(getCall.calledOnce).to.eql(true);
      expect(setCall.calledOnce).to.eql(false);
      expect(req.uniqueRequestKey).to.be.undefined;
    });

    it("if the same key is sent before the first has expired, it should reject the second call", (done) => {
      res.status = (code) => {
        return {
          send(message) {
            expect(code).to.eql(409);
            expect(message).to.eql("test message");
            done();
          }
        };
      };
      expiringKey = new ExpiringKey(redis);

      const middleware = expiringKey.middleWare({lookup: "body.paramToFind", path: "path", method: "method", message: "test message"});
      
      const req = {body: {paramToFind: "foundParam"}};
      const getCall = sandbox.stub(redis, "get").callsFake((key, callback) => {
        callback(null, null);
      });
 
      middleware(req, res, () => {
        return middleware(req, res, () => { 
          expect(true).to.eql(false);
          done();
        });
      });
    }); 
    
    it("if lookup exists, and db returns a value it should call onKeyFound, with a custom message", (done) => {
      res.status = (code) => {
        return {
          send(message) {
            expect(code).to.eql(409);
            expect(message).to.eql("test message");
            done();
          }
        };
      };
      expiringKey = new ExpiringKey(redis);

      const middleware = expiringKey.middleWare({lookup: "body.paramToFind", path: "path", method: "method", message: "test message"});
      
      const req = {body: {paramToFind: "foundParam"}};
 
      middleware(req, res, () => {
        return middleware(req, res, () => { 
          expect(true).to.eql(false);
          done();
        });
      });
    });
    
    it("should add the key if setKey is called directly outside of the middleware", (done) => {
      res.status = (code) => {
        return {
          send(message) {
            expect(code).to.eql(409);
            expect(message).to.eql("test message");
            done();
          }
        };
      };
      expiringKey = new ExpiringKey(redis);
      
      const key = "foundParam";
 
      expiringKey.setKey(key, 10000, (err, result) => {
          if (!result) {
            done("Key was unexpectedly not set");
          }

          expect(result).to.exist.eq("OK");
          done();
        });
    });

    it("should return null if setKey is called directly outside of the middleware and the key already exists", (done) => {
      res.status = (code) => {
        return {
          send(message) {
            expect(code).to.eql(409);
            expect(message).to.eql("test message");
            done();
          }
        };
      };
      expiringKey = new ExpiringKey(redis);
      
      const key = "foundParam";
 
      expiringKey.setKey(key, 10000, (err, result) => {
        expect(result).to.exist.eq("OK");
        expiringKey.setKey(key, 10000, (err, result) => {
          expect(result).to.be.null;
          done();
        });
      });
    });
  });
});
