"use strict";

describe.only("SwaggerRequestHandler", function () {

  let expect = require("chai").expect,
      swaggerRequestHandler = require("../index.js").swaggerRequestHandler;

  class HandlerClass {
    getSpec () { return "specc"; }
    handler (req) { req.fn(); }
  }

  it("should create an object with spec from given handler", function () {
    let handlerInstance = new HandlerClass();
    let swaggerHandler = swaggerRequestHandler(handlerInstance);

    expect(swaggerHandler.spec).to.equal("specc");
  });

  it("should create an object with spec from the last argument (must be the handler)", function () {
    let handlerInstance = new HandlerClass();
    let swaggerHandler = swaggerRequestHandler(function () {}, function () {}, handlerInstance);

    expect(swaggerHandler.spec).to.equal("specc");
  });

  it("should create object with action that calls the given handler", function (done) {
    let handlerInstance = new HandlerClass();
    let swaggerHandler = swaggerRequestHandler(handlerInstance);

    swaggerHandler.action({fn: done});
  });

  it("should create object with action that executes middlewares before calling the given handler", function (done) {
    let handlerInstance = new HandlerClass();

    let middleware = function (req, res, next) {
      expect(req).to.deep.equal(request);
      next();
    };

    let request = {fn: done};
    let swaggerHandler = swaggerRequestHandler(middleware, middleware, middleware, handlerInstance);
    swaggerHandler.action(request);
  });

  it("should respond with error if a middleware returns error", function (done) {
    let handlerInstance = new HandlerClass();

    let middleware = function (req, res, next) {
      expect(req).to.deep.equal(request);
      next();
    };

    let errorMiddleware = function (req, res, next) {
      next(new Error("an errr"));
    };

    let response = {
      status: function () { return this; },
      json: function (body) {
        expect(body).to.deep.equal({message: "an errr"});
        done();
      }
    };

    let request = {fn: function () {}};
    let swaggerHandler = swaggerRequestHandler(middleware, errorMiddleware, middleware, handlerInstance);
    swaggerHandler.action(request, response);
  });


});