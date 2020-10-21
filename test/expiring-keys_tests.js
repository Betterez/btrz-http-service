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
      const setCall = sandbox.stub(redis, "set").callsFake((key, value, index, expire, callback) => {
        callback();
      });      
      sandbox.spy(res, "send");
      const result = await middleware(req, res, () => { return "next" });
      expect(getCall.calledOnce).to.eql(true);
      expect(setCall.calledOnce).to.eql(false);
      expect(res.send.calledOnce).to.eql(true);
    });

    it("if lookup does not exist it should set the value of the uniqueRequestKey", async () => {
      expiringKey = new ExpiringKey(redis);
      const middleware = expiringKey.middleWare({lookup: "body.paramToFind", path: "path", method: "method"});
      const req = {body: {paramToFind: "foundParam"}};
      const getCall = sandbox.stub(redis, "get").callsFake((key, callback) => {
        callback();
      });
      const setCall = sandbox.stub(redis, "set").callsFake((key, value, index, expire, callback) => {
        callback();
      });

      await middleware(req, res, () => { return "next" });
      expect(getCall.calledOnce).to.eql(true);
      expect(setCall.calledOnce).to.eql(true);
      expect(req.uniqueRequestKey).to.eql("key:path:method:body.paramToFind:foundParam");
    });

    it.skip("if the same key is sent before the first has expired, it should reject the second call", async () => {
      sandbox.spy(redis, "get");
      sandbox.spy(redis, "set");
      sandbox.spy(res, "send");
      expiringKey = new ExpiringKey(redis);
      const middleware = expiringKey.middleWare({lookup: "body.paramToFind", path: "path", method: "method"});
      const req = {body: {paramToFind: "foundParam"}};

      await middleware(req, res, async () => { 
        //expect(redis.get.calledOnce).to.eql(true);
        //expect(redis.set.calledOnce).to.eql(true);
        expect(req.uniqueRequestKey).to.eql("key:path:method:body.paramToFind:foundParam");
        //expect(res.send.calledOnce).to.eql(false);
        
        const result = await middleware(req, res, () => { 
          //expect(redis.get.calledTwice).to.eql(true);
          //expect(redis.set.calledOnce).to.eql(true);
          
        });
        expect(res.send.calledOnce).to.eql(true);
      });
    });   
  });
});
