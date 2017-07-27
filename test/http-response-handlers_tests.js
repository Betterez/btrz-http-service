"use strict";

describe("Response Handlers", function () {

  let expect = require("chai").expect,
      ValidationError = require("../index.js").ValidationError,
      responseHandlers = require("../index.js").responseHandlers;

  describe(".success()", function () {

    let response;
    beforeEach(function () {
      response = {
        status: function () { return this; },
        json: function () { return this; }
      };
    })

    it("should return handler function", function () {
      expect(typeof responseHandlers.success()).to.eql("function")
    });

    it("should set status code 200 on response", function (done) {
      response.status = function (status) {
        expect(status).to.equal(200);
        done();
        return this;
      };
      responseHandlers.success(response)();
    });

    it("should set the passed status code on response", function (done) {
      response.status = function (status) {
        expect(status).to.equal(204);
        done();
        return this;
      };
      responseHandlers.success(response, 204)();
    });

    it("should set 200 in case the passed status code is not a success valid one", function (done) {
      response.status = function (status) {
        expect(status).to.equal(200);
        done();
        return this;
      };
      responseHandlers.success(response, 404)();
    });

    it("should send data as json", function (done) {
      let data = {the: "answer"};
      response.json = function (sent) {
        expect(sent).to.deep.equal(data);
        done();
        return this;
      };
      responseHandlers.success(response)(data);
    });
  });

  describe(".error()", function () {

    let response, logger;
    beforeEach(function () {
      response = {
        status: function () { return this; },
        json: function () { return this; }
      };
      logger = {error: function () {}};
    })

    it("should return handler function", function () {
      expect(typeof responseHandlers.error()).to.eql("function");
    });

    it("should not blow if logger is not given", () => {
      function sut() {
        responseHandlers.error(response)("h");
      }
      expect(sut).not.to.throw();
    });

    it("should not blow if error is not given", () => {
      function sut() {
        responseHandlers.error(response, logger)();
      }
      expect(sut).not.to.throw();
    });

    it("should not blow if error is an empty array", () => {
      function sut() {
        responseHandlers.error(response, logger)([]);
      }
      expect(sut).not.to.throw();
    });

    it("should set status code 500 for generic error", function (done) {
      response.status = function (status) {
        expect(status).to.equal(500);
        done();
        return this;
      };
      let err = new Error("hello");
      responseHandlers.error(response, logger)(err);
    });

    it("should set status code 400 for validation error", function (done) {
      response.status = function (status) {
        expect(status).to.equal(400);
        done();
        return this;
      };
      let err = new ValidationError("HI", "hello");
      responseHandlers.error(response, logger)(err);
    });

    it("should set status code of the validation error", function (done) {
      response.status = function (status) {
        expect(status).to.equal(404);
        done();
        return this;
      };
      let err = new ValidationError("HI", "hello", 404);
      responseHandlers.error(response, logger)(err);
    });

    it("should set status code 409 (conflict) for a duplicated index error", function (done) {
      response.status = function (status) {
        expect(status).to.equal(409);
        done();
        return this;
      };

      let err = {message: "E11000 duplicate key error index: betterez_core.stations.$name_1_accountId_1 dup key"};
      responseHandlers.error(response, logger)(err);
    });

    it("should send error message as json", function (done) {
      response.json = function (sent) {
        expect(sent).to.deep.equal({code: "hello", message: "hello"});
        done();
        return this;
      };
      let err = new Error("hello");
      responseHandlers.error(response, logger)(err);
    });

    it("should set status code 400 for several validation errors", function (done) {
      response.status = function (status) {
        expect(status).to.equal(400);
        done();
        return this;
      };
      let errs = [new ValidationError("HI", "hello"), new ValidationError("BYE", "bye")];
      responseHandlers.error(response, logger)(errs);
    });

    it("should send error messages as json for several validation errors", function (done) {
      response.json = function (sent) {
        expect(sent).to.deep.equal({code: "HI", message: "hello, bye"});
        done();
        return this;
      };
      let errs = [new ValidationError("HI", "hello"), new ValidationError("BYE", "bye")];
      responseHandlers.error(response, logger)(errs);
    });

  });

  describe(".createError()", function () {

    it("should return an error called with no params", function () {
      expect(responseHandlers.createError()).to.be.instanceof(Error);
    });

    it("should return an error called with a string", function () {
      expect(responseHandlers.createError("foo")).to.be.instanceof(Error);
    });

    it("should return the same Error if called with an Error", function () {
      let err = new Error("this is an error");
      expect(responseHandlers.createError(err)).to.be.eql(err);
    });

    it("should return the same Error if called with a ValidationError without message", function () {
      let err = new ValidationError("code");
      expect(responseHandlers.createError(err)).to.be.deep.equal(err);
    });
  });

  describe("_isMongoDbConflict()", function () {

    it("should return true for a duplicated index error", function () {
      let err = {message: "E11000 duplicate key error index: betterez_core.stations.$name_1_accountId_1 dup key"};
      expect(responseHandlers._isMongoDbConflict(err)).to.be.true;
    });

    it("should return false for another non-mongo generic error", function () {
      let err = new Error("any error!");
      expect(responseHandlers._isMongoDbConflict(err)).to.be.false;
    });

  });
});
