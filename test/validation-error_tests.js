"use strict";
const {describe, it} = require("node:test");
const assert = require("node:assert/strict");

describe("ValidationError", () => {
  const ValidationError = require("../index.js").ValidationError;

  describe("constructor", () => {
    it("should be a sub class of Error", () => {
      assert.ok((new ValidationError()) instanceof Error);
    });

    it("should capture stack trace", () => {
      assert.match((new ValidationError()).stack, /error_tests/);
    });

    it("should set proper error name", () => {
      assert.equal((new ValidationError()).name, "ValidationError");
    });

    it("should set given error code", () => {
      assert.equal((new ValidationError("WRONG")).code, "WRONG");
    });

    it("should set given error message", () => {
      assert.equal((new ValidationError("WRONG", "something's wrong")).message, "something's wrong");
    });

    it("should set http 400 status code", () => {
      assert.equal((new ValidationError("WRONG", "something's wrong")).status, 400);
    });

    it("should set given http status code", () => {
      assert.equal((new ValidationError("NOTFOUND", "not here", 404)).status, 404);
    });

    it("should have empty string defaults for code and message", () => {
      assert.equal((new ValidationError()).code, "");
      assert.equal((new ValidationError()).message, "");
    });
  });
});
