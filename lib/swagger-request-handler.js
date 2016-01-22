"use strict";

let swaggerRequestHandler = function (handler) {
  return {
    "spec": handler.getSpec(),
    "action": handler.handler.bind(handler)
  };
};

module.exports = swaggerRequestHandler;