"use strict";

describe("ValidationError", function () {

  let expect = require("chai").expect,
      ValidationError = require("../index.js").ValidationError;

  describe("constructor", function () {

    it("should be a sub class of Error", function () {
      expect((new ValidationError())).to.be.an.instanceOf(Error);
    });

    it("should capture stack trace", function () {
      expect((new ValidationError()).stack).to.include("error_tests");
    });

    it("should set proper error name", function () {
      expect((new ValidationError()).name).to.equal("ValidationError");
    });

    it("should set given error code", function () {
      expect((new ValidationError("WRONG")).code).to.equal("WRONG");
    });

    it("should set given error message", function () {
      expect((new ValidationError("WRONG", "something's wrong")).message).to.equal("something's wrong");
    });

    it("should set http 400 status code", function () {
      expect((new ValidationError("WRONG", "something's wrong")).status).to.equal(400);
    });

    it("should set given http status code", function () {
      expect((new ValidationError("NOTFOUND", "not here", 404)).status).to.equal(404);
    });

    it("should have empty string defaults for code and message", function () {
      expect((new ValidationError()).code).to.equal("");
      expect((new ValidationError()).message).to.equal("");
    });
  });
});