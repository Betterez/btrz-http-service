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
      expect(responseHandlers.success()).to.be.a.function;
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
      expect(responseHandlers.error()).to.be.a.function;
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
      let err = new ValidationError("hello");
      responseHandlers.error(response, logger)(err);
    });

    it("should set status code of the validation error", function (done) {
      response.status = function (status) {
        expect(status).to.equal(404);
        done();
        return this;
      };
      let err = new ValidationError("hello", 404);
      responseHandlers.error(response, logger)(err);
    });

    it("should send error message as json", function (done) {
      response.json = function (sent) {
        expect(sent).to.deep.equal({message: "hello"});
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
      let errs = [new ValidationError("hello"), new ValidationError("bye")];
      responseHandlers.error(response, logger)(errs);
    });

    it("should send error messages as json for several validation errors", function (done) {
      response.json = function (sent) {
        expect(sent).to.deep.equal({message: "hello, bye"});
        done();
        return this;
      };
      let errs = [new ValidationError("hello"), new ValidationError("bye")];
      responseHandlers.error(response, logger)(errs);
    });

  });
});