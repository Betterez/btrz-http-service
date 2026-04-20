"use strict";
const {describe, it, beforeEach} = require("node:test");
const assert = require("node:assert/strict");

describe("Response Handlers", () => {
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
      assert.equal(typeof responseHandlers.success(), "function");
    });

    it("should set status code 200 on response", () => {
      response.status = function _status(status) {
        assert.equal(status, 200);
        return this;
      };
      responseHandlers.success(response)();
    });

    it("should set the passed status code on response", () => {
      response.status = function _status(status) {
        assert.equal(status, 204);
        return this;
      };
      responseHandlers.success(response, 204)();
    });

    it("should set 200 in case the passed status code is not a success valid one", () => {
      response.status = function _status(status) {
        assert.equal(status, 200);
        return this;
      };
      responseHandlers.success(response, 404)();
    });

    it("should send data as json", () => {
      const data = {the: "answer"};
      response.json = function _json(sent) {
        assert.deepEqual(sent, data);
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
      assert.equal(typeof responseHandlers.error(), "function");
    });

    it("should not blow if logger is not given", () => {
      function sut() {
        responseHandlers.error(response)("h");
      }
      assert.doesNotThrow(sut);
    });

    it("should not blow if error is not given", () => {
      function sut() {
        responseHandlers.error(response, logger)();
      }
      assert.doesNotThrow(sut);
    });

    it("should not blow if error is an empty array", () => {
      function sut() {
        responseHandlers.error(response, logger)([]);
      }
      assert.doesNotThrow(sut);
    });

    it("should set status code 500 for generic error", () => {
      response.status = function _status(status) {
        assert.equal(status, 500);
        return this;
      };
      const err = new Error("hello");
      responseHandlers.error(response, logger)(err);
    });

    it("should set status code 400 for validation error", () => {
      response.status = function _status(status) {
        assert.equal(status, 400);
        return this;
      };
      const err = new ValidationError("HI", "hello");
      responseHandlers.error(response, logger)(err);
    });

    it("should set status code of the validation error", () => {
      response.status = function _status(status) {
        assert.equal(status, 404);
        return this;
      };
      const err = new ValidationError("HI", "hello", 404);
      responseHandlers.error(response, logger)(err);
    });

    it("should set status code 404 for an error with type NOT_FOUND", () => {
      response.status = function _status(status) {
        assert.equal(status, 404);
        return this;
      };
      const err = new Error("hello");
      err.code = "HI";
      err.type = "NOT_FOUND";
      responseHandlers.error(response, logger)(err);
    });

    it("should set status code 400 for an error with type INVALID", () => {
      response.status = function _status(status) {
        assert.equal(status, 400);
        return this;
      };
      const err = new Error("hello");
      err.code = "HI";
      err.type = "INVALID";
      responseHandlers.error(response, logger)(err);
    });

    it("should set status code 400 for an error with type not recognized", () => {
      response.status = function _status(status) {
        assert.equal(status, 400);
        return this;
      };
      const err = new Error("hello");
      err.code = "HI";
      err.type = "NEW_ERR_TYPE";
      responseHandlers.error(response, logger)(err);
    });

    it("should set status code 409 (conflict) for a duplicated index error", () => {
      response.status = function _status(status) {
        assert.equal(status, 409);
        return this;
      };

      const err = {message: "E11000 duplicate key error index: betterez_core.stations.$name_1_accountId_1 dup key"};
      responseHandlers.error(response, logger)(err);
    });

    it("should not fail if no logger", () => {
      response.json = function _json(sent) {
        assert.deepEqual(sent, {code: "hello", message: "hello"});
        return this;
      };
      const err = new Error("hello");
      responseHandlers.error(response, null)(err);
    });

    it("should send error message as json", () => {
      response.json = function _json(sent) {
        assert.deepEqual(sent, {code: "hello", message: "hello"});
        return this;
      };
      const err = new Error("hello");
      responseHandlers.error(response, logger)(err);
    });

    it("should send error message as json for error with type and code", () => {
      response.json = function _json(sent) {
        assert.deepEqual(sent, {code: "HI", message: "hello"});
        return this;
      };
      const err = new Error("hello");
      err.code = "HI";
      err.type = "TYPE";
      responseHandlers.error(response, logger)(err);
    });

    it("should log fatal if err is 500", () => {
      let didLog = false;
      const _logger = {
        fatal() {
          didLog = true;
        }
      };
      response.json = function _json(sent) {
        assert.deepEqual(sent, {
          code: "hello",
          message: "hello"
        });
        return this;
      };
      const err = new Error("hello");
      responseHandlers.error(response, _logger)(err);
      assert.equal(didLog, true);
    });

    it("should log the err status if provided", () => {
      let didLog = false;
      const _logger = {
        fatal() {
          didLog = true;
        }
      };
      response.status = function _status(status) {
        assert.equal(status, 425);
        return this;
      };
      response.json = function _json(sent) {
        assert.deepEqual(sent, {
          code: "hello",
          message: "hello"
        });
        return this;
      };
      const err = new Error("hello");
      err.status = 425;
      responseHandlers.error(response, _logger)(err);
      assert.equal(didLog, true);
    });


    it("should log the err status 500 if err.status isNaN", () => {
      let didLog = false;
      const _logger = {
        fatal() {
          didLog = true;
        }
      };
      response.status = function _status(status) {
        assert.equal(status, 500);
        return this;
      };
      response.json = function _json(sent) {
        assert.deepEqual(sent, {
          code: "hello",
          message: "hello"
        });
        return this;
      };
      const err = new Error("hello");
      err.status = "something";
      responseHandlers.error(response, _logger)(err);
      assert.equal(didLog, true);
    });

    it("should set status code 400 for several validation errors", () => {
      response.status = function _status(status) {
        assert.equal(status, 400);
        return this;
      };
      const errs = [new ValidationError("HI", "hello"), new ValidationError("BYE", "bye")];
      responseHandlers.error(response, logger)(errs);
    });

    it("should log error if err is 400", () => {
      let didLog = false;
      const _logger = {
        error() {
          didLog = true;
        }
      };
      response.status = function _status(status) {
        assert.equal(status, 400);
        return this;
      };
      const errs = [new ValidationError("HI", "hello"), new ValidationError("BYE", "bye")];
      responseHandlers.error(response, _logger)(errs);
      assert.equal(didLog, true);
    });

    it("should send error messages as json for several validation errors", () => {
      response.json = function _json(sent) {
        assert.deepEqual(sent, {code: "HI", message: "hello, bye"});
        return this;
      };
      const errs = [new ValidationError("HI", "hello"), new ValidationError("BYE", "bye")];
      responseHandlers.error(response, logger)(errs);
    });
  });

  describe(".createError()", () => {
    it("should return an error called with no params", () => {
      assert.ok(responseHandlers.createError() instanceof Error);
    });

    it("should return an error called with a string", () => {
      assert.ok(responseHandlers.createError("foo") instanceof Error);
    });

    it("should return the same Error if called with an Error", () => {
      const err = new Error("this is an error");
      assert.equal(responseHandlers.createError(err), err);
    });

    it("should return the same Error if called with a ValidationError without message", () => {
      const err = new ValidationError("code");
      assert.deepEqual(responseHandlers.createError(err), err);
    });
  });

  describe("_isMongoDbConflict()", () => {
    it("should return true for a duplicated index error", () => {
      const err = {message: "E11000 duplicate key error index: betterez_core.stations.$name_1_accountId_1 dup key"};
      assert.equal(responseHandlers._isMongoDbConflict(err), true);
    });

    it("should return false for another non-mongo generic error", () => {
      const err = new Error("any error!");
      assert.equal(responseHandlers._isMongoDbConflict(err), false);
    });

    it("should return true for a duplicated collection error", () => {
      const err = {message: "E11000 duplicate key error collection: database_name.collection.$indexName dup key"};
      assert.equal(responseHandlers._isMongoDbConflict(err), true);
    });
  });
});
