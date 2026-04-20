"use strict";
const {describe, it} = require("node:test");
const assert = require("node:assert/strict");

describe("SwaggerRequestHandler", () => {
  const swaggerRequestHandler = require("../index.js").swaggerRequestHandler;

  class HandlerClass {
    getSpec() {
      return {path: "specc"};
    }
    handler(req) {
      req.fn();
    }
  }

  class HandlerWithSecurityClass {
    getSpec() {
      return {
        "method": "POST",
        "security": {
          "ApiKeyAuth": []
        }
      };
    }

    handler(req) {
      req.fn();
    }
  }

  it("should create an object with spec from given handler", () => {
    const handlerInstance = new HandlerClass();
    const swaggerHandler = swaggerRequestHandler(handlerInstance);

    assert.equal(swaggerHandler.spec.path, "specc");
  });

  it("should create an object with spec from the last argument (must be the handler)", () => {
    const handlerInstance = new HandlerClass();
    const swaggerHandler = swaggerRequestHandler(() => {}, () => {}, handlerInstance);

    assert.equal(swaggerHandler.spec.path, "specc");
  });

  it("should create object with action that calls the given handler", async () => {
    const handlerInstance = new HandlerClass();
    const swaggerHandler = swaggerRequestHandler(handlerInstance);

    await new Promise((resolve) => {
      swaggerHandler.action({fn: resolve});
    });
  });

  it("should create object with action that calls the given handler and add ApiKeyAuth and JwtAuth security object", () => {
    const handlerInstance = new HandlerWithSecurityClass();
    function authenticateTokenMiddleware() {
      return true;
    }
    function authToken() {
      // eslint-disable-next-line func-names
      return function () {
        return authenticateTokenMiddleware();
      };
    }
    const swaggerHandler = swaggerRequestHandler(authToken, handlerInstance);

    assert.equal(swaggerHandler.spec.method, "POST");
    assert.equal(swaggerHandler.spec.security[0].ApiKeyAuth.length, 0);
    assert.equal(swaggerHandler.spec.security[0].JwtAuth.length, 0);
  });

  it("should create object with action that calls the given handler and add only the ApiKeyAuth security object", () => {
    const handlerInstance = new HandlerWithSecurityClass();
    const swaggerHandler = swaggerRequestHandler(handlerInstance);

    assert.equal(swaggerHandler.spec.method, "POST");
    assert.equal(swaggerHandler.spec.security[0].ApiKeyAuth.length, 0);
    assert.equal(swaggerHandler.spec.security[0].JwtAuth, undefined);
  });

  it("should create object with action that calls the given handler and add ApiKeyAuth and BasicAuth security object", () => {
    const handlerInstance = new HandlerWithSecurityClass();
    function authenticate() {
      return true;
    }
    function authToken() {
      // eslint-disable-next-line func-names
      return function () {
        return authenticate();
      };
    }
    const swaggerHandler = swaggerRequestHandler(authToken, handlerInstance);

    assert.equal(swaggerHandler.spec.method, "POST");
    assert.equal(swaggerHandler.spec.security[0].ApiKeyAuth.length, 0);
    assert.equal(swaggerHandler.spec.security[0].BasicAuth.length, 0);
  });

  it("should create object with action that executes middlewares before calling the given handler", async () => {
    const handlerInstance = new HandlerClass();
    const request = {};

    function middleware(req, res, next) {
      assert.deepEqual(req, request);
      next();
    }

    const swaggerHandler = swaggerRequestHandler(middleware, middleware, middleware, handlerInstance);
    await new Promise((resolve) => {
      request.fn = resolve;
      swaggerHandler.action(request);
    });
  });

  it("should respond with error if a middleware returns error", async () => {
    const handlerInstance = new HandlerClass();
    const request = {fn: () => {}};

    function middleware(req, res, next) {
      assert.deepEqual(req, request);
      next();
    }

    function errorMiddleware(req, res, next) {
      next(new Error("an errr"));
    }

    const response = {
      status(statusCode) {
        assert.equal(statusCode, 500);
        return this;
      },
      json(body) {
        assert.deepEqual(body, {code: "an errr", message: "an errr"});
        resolvePromise();
      }
    };
    let resolvePromise;

    const swaggerHandler = swaggerRequestHandler(middleware, errorMiddleware, middleware, handlerInstance);
    await new Promise((resolve) => {
      resolvePromise = resolve;
      swaggerHandler.action(request, response);
    });
  });
});
