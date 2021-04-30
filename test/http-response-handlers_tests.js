"use strict";

describe("Response Handlers", () => {
  const expect = require("chai").expect;
  const ValidationError = require("../index.js").ValidationError;
  const responseHandlers = require("../index.js").responseHandlers;

  describe(".success()", () => {
    let response = null;
    beforeEach(() => {
      response = {
        status() {
          return this;
        },
        json() {
          return this;
        }
      };
    });

    it("should return handler function", () => {
      expect(typeof responseHandlers.success()).to.eql("function");
    });

    it("should set status code 200 on response", (done) => {
      response.status = function _status(status) {
        expect(status).to.equal(200);
        done();
        return this;
      };
      responseHandlers.success(response)();
    });

    it("should set the passed status code on response", (done) => {
      response.status = function _status(status) {
        expect(status).to.equal(204);
        done();
        return this;
      };
      responseHandlers.success(response, 204)();
    });

    it("should set 200 in case the passed status code is not a success valid one", (done) => {
      response.status = function _status(status) {
        expect(status).to.equal(200);
        done();
        return this;
      };
      responseHandlers.success(response, 404)();
    });

    it("should send data as json", (done) => {
      const data = {the: "answer"};
      response.json = function _json(sent) {
        expect(sent).to.deep.equal(data);
        done();
        return this;
      };
      responseHandlers.success(response)(data);
    });
  });

  describe(".error()", () => {
    let response = null;
    let logger = null;

    beforeEach(() => {
      response = {
        status() {
          return this;
        },
        json() {
          return this;
        }
      };
      logger = {
        error() {
          // no op
        },
        fatal() {
          // no op
        }
      };
    });

    it("should return handler function", () => {
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

    it("should set status code 500 for generic error", (done) => {
      response.status = function _status(status) {
        expect(status).to.equal(500);
        done();
        return this;
      };
      const err = new Error("hello");
      responseHandlers.error(response, logger)(err);
    });

    it("should set status code 400 for validation error", (done) => {
      response.status = function _status(status) {
        expect(status).to.equal(400);
        done();
        return this;
      };
      const err = new ValidationError("HI", "hello");
      responseHandlers.error(response, logger)(err);
    });

    it("should set status code of the validation error", (done) => {
      response.status = function _status(status) {
        expect(status).to.equal(404);
        done();
        return this;
      };
      const err = new ValidationError("HI", "hello", 404);
      responseHandlers.error(response, logger)(err);
    });

    it("should set status code 404 for an error with type NOT_FOUND", (done) => {
      response.status = function _status(status) {
        expect(status).to.equal(404);
        done();
        return this;
      };
      const err = new Error("hello");
      err.code = "HI";
      err.type = "NOT_FOUND";
      responseHandlers.error(response, logger)(err);
    });

    it("should set status code 400 for an error with type INVALID", (done) => {
      response.status = function _status(status) {
        expect(status).to.equal(400);
        done();
        return this;
      };
      const err = new Error("hello");
      err.code = "HI";
      err.type = "INVALID";
      responseHandlers.error(response, logger)(err);
    });

    it("should set status code 400 for an error with type not recognized", (done) => {
      response.status = function _status(status) {
        expect(status).to.equal(400);
        done();
        return this;
      };
      const err = new Error("hello");
      err.code = "HI";
      err.type = "NEW_ERR_TYPE";
      responseHandlers.error(response, logger)(err);
    });

    it("should set status code 409 (conflict) for a duplicated index error", (done) => {
      response.status = function _status(status) {
        expect(status).to.equal(409);
        done();
        return this;
      };

      const err = {message: "E11000 duplicate key error index: betterez_core.stations.$name_1_accountId_1 dup key"};
      responseHandlers.error(response, logger)(err);
    });

    it("should not fail if no logger", (done) => {
      response.json = function _json(sent) {
        expect(sent).to.deep.equal({code: "hello", message: "hello"});
        done();
        return this;
      };
      const err = new Error("hello");
      responseHandlers.error(response, null)(err);
    });

    it("should send error message as json", (done) => {
      response.json = function _json(sent) {
        expect(sent).to.deep.equal({code: "hello", message: "hello"});
        done();
        return this;
      };
      const err = new Error("hello");
      responseHandlers.error(response, logger)(err);
    });

    it("should send error message as json for error with type and code", (done) => {
      response.json = function _json(sent) {
        expect(sent).to.deep.equal({code: "HI", message: "hello"});
        done();
        return this;
      };
      const err = new Error("hello");
      err.code = "HI";
      err.type = "TYPE";
      responseHandlers.error(response, logger)(err);
    });

    it("should log fatal if err is 500", (done) => {
      const _logger = {
        fatal() {
          expect(1).to.be.eql(1);
        }
      };
      response.json = function _json(sent) {
        expect(sent).to.deep.equal({
          code: "hello",
          message: "hello"
        });
        done();
        return this;
      };
      const err = new Error("hello");
      responseHandlers.error(response, _logger)(err);
    });

    it("should log the err status if provided", (done) => {
      const _logger = {
        fatal() {
          expect(1).to.be.eql(1);
        }
      };
      response.status = function _status(status) {
        expect(status).to.equal(425);
        return this;
      };
      response.json = function _json(sent) {
        expect(sent).to.deep.equal({
          code: "hello",
          message: "hello"
        });
        done();
        return this;
      };
      const err = new Error("hello");
      err.status = 425;
      responseHandlers.error(response, _logger)(err);
    });


    it("should log the err status 500 if err.status isNaN", (done) => {
      const _logger = {
        fatal() {
          expect(1).to.be.eql(1);
        }
      };
      response.status = function _status(status) {
        expect(status).to.equal(500);
        return this;
      };
      response.json = function _json(sent) {
        expect(sent).to.deep.equal({
          code: "hello",
          message: "hello"
        });
        done();
        return this;
      };
      const err = new Error("hello");
      err.status = "something";
      responseHandlers.error(response, _logger)(err);
    });

    it("should set status code 400 for several validation errors", (done) => {
      response.status = function _status(status) {
        expect(status).to.equal(400);
        done();
        return this;
      };
      const errs = [new ValidationError("HI", "hello"), new ValidationError("BYE", "bye")];
      responseHandlers.error(response, logger)(errs);
    });

    it("should log error if err is 400", (done) => {
      const _logger = {
        error() {
          expect(1).to.be.eql(1);
        }
      };
      response.status = function _status(status) {
        expect(status).to.equal(400);
        done();
        return this;
      };
      const errs = [new ValidationError("HI", "hello"), new ValidationError("BYE", "bye")];
      responseHandlers.error(response, _logger)(errs);
    });

    it("should send error messages as json for several validation errors", (done) => {
      response.json = function _json(sent) {
        expect(sent).to.deep.equal({code: "HI", message: "hello, bye"});
        done();
        return this;
      };
      const errs = [new ValidationError("HI", "hello"), new ValidationError("BYE", "bye")];
      responseHandlers.error(response, logger)(errs);
    });
  });

  describe(".createError()", () => {
    it("should return an error called with no params", () => {
      expect(responseHandlers.createError()).to.be.instanceof(Error);
    });

    it("should return an error called with a string", () => {
      expect(responseHandlers.createError("foo")).to.be.instanceof(Error);
    });

    it("should return the same Error if called with an Error", () => {
      const err = new Error("this is an error");
      expect(responseHandlers.createError(err)).to.be.eql(err);
    });

    it("should return the same Error if called with a ValidationError without message", () => {
      const err = new ValidationError("code");
      expect(responseHandlers.createError(err)).to.be.deep.equal(err);
    });
  });

  describe("_isMongoDbConflict()", () => {
    it("should return true for a duplicated index error", () => {
      const err = {message: "E11000 duplicate key error index: betterez_core.stations.$name_1_accountId_1 dup key"};
      expect(responseHandlers._isMongoDbConflict(err)).to.be.eql(true);
    });

    it("should return false for another non-mongo generic error", () => {
      const err = new Error("any error!");
      expect(responseHandlers._isMongoDbConflict(err)).to.be.eql(false);
    });

    it("should return true for a duplicated collection error", () => {
      const err = {message: "E11000 duplicate key error collection: database_name.collection.$indexName dup key"};
      expect(responseHandlers._isMongoDbConflict(err)).to.be.eql(true);
    });
  });
});
