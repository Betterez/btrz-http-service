"use strict";

describe("SwaggerRequestHandler", () => {
  const expect = require("chai").expect;
  const swaggerRequestHandler = require("../index.js").swaggerRequestHandler;

  class HandlerClass {
    getSpec() {
      return "specc";
    }
    handler(req) {
      req.fn();
    }
  }

  it("should create an object with spec from given handler", () => {
    const handlerInstance = new HandlerClass();
    const swaggerHandler = swaggerRequestHandler(handlerInstance);

    expect(swaggerHandler.spec).to.equal("specc");
  });

  it("should create an object with spec from the last argument (must be the handler)", () => {
    const handlerInstance = new HandlerClass();
    const swaggerHandler = swaggerRequestHandler(() => {}, () => {}, handlerInstance);

    expect(swaggerHandler.spec).to.equal("specc");
  });

  it("should create object with action that calls the given handler", (done) => {
    const handlerInstance = new HandlerClass();
    const swaggerHandler = swaggerRequestHandler(handlerInstance);

    swaggerHandler.action({fn: done});
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
