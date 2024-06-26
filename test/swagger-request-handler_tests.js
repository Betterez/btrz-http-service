"use strict";

describe("SwaggerRequestHandler", () => {
  const expect = require("chai").expect;
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

    expect(swaggerHandler.spec.path).to.equal("specc");
  });

  it("should create an object with spec from the last argument (must be the handler)", () => {
    const handlerInstance = new HandlerClass();
    const swaggerHandler = swaggerRequestHandler(() => {}, () => {}, handlerInstance);

    expect(swaggerHandler.spec.path).to.equal("specc");
  });

  it("should create object with action that calls the given handler", (done) => {
    const handlerInstance = new HandlerClass();
    const swaggerHandler = swaggerRequestHandler(handlerInstance);

    swaggerHandler.action({fn: done});
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

    expect(swaggerHandler.spec.method).to.equal("POST");
    expect(swaggerHandler.spec.security[0].ApiKeyAuth.length).to.equal(0);
    expect(swaggerHandler.spec.security[0].JwtAuth.length).to.equal(0);
  });

  it("should create object with action that calls the given handler and add only the ApiKeyAuth security object", () => {
    const handlerInstance = new HandlerWithSecurityClass();
    const swaggerHandler = swaggerRequestHandler(handlerInstance);

    expect(swaggerHandler.spec.method).to.equal("POST");
    expect(swaggerHandler.spec.security[0].ApiKeyAuth.length).to.equal(0);
    expect(swaggerHandler.spec.security[0].JwtAuth).to.equal(undefined);
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

    expect(swaggerHandler.spec.method).to.equal("POST");
    expect(swaggerHandler.spec.security[0].ApiKeyAuth.length).to.equal(0);
    expect(swaggerHandler.spec.security[0].BasicAuth.length).to.equal(0);
  });

  it("should create object with action that executes middlewares before calling the given handler", (done) => {
    const handlerInstance = new HandlerClass();
    const request = {fn: done};

    function middleware(req, res, next) {
      expect(req).to.deep.equal(request);
      next();
    }

    const swaggerHandler = swaggerRequestHandler(middleware, middleware, middleware, handlerInstance);
    swaggerHandler.action(request);
  });

  it("should respond with error if a middleware returns error", (done) => {
    const handlerInstance = new HandlerClass();
    const request = {fn: () => {}};

    function middleware(req, res, next) {
      expect(req).to.deep.equal(request);
      next();
    }

    function errorMiddleware(req, res, next) {
      next(new Error("an errr"));
    }

    const response = {
      status(statusCode) {
        expect(statusCode).to.equal(500);
        return this;
      },
      json(body) {
        expect(body).to.deep.equal({code: "an errr", message: "an errr"});
        done();
      }
    };

    const swaggerHandler = swaggerRequestHandler(middleware, errorMiddleware, middleware, handlerInstance);
    swaggerHandler.action(request, response);
  });
});
