"use strict";

const errorHandler = require("./http-response-handlers").error;

// accepts "multiple callback functions that behave just like middleware"
// like in Express, their signature must be (req, res, next)
// last argument must always be a Handler class instance,
// that implements getSpec() and handler(req, res)
function swaggerRequestHandler() {
  const securityJwt = [
    {
      "ApiKeyAuth": [],
      "JwtAuth": []
    }];
  const securityApi = [
    {
      "ApiKeyAuth": []
    }];
  const handlers = arguments; // eslint-disable-line prefer-rest-params
  let useJWTSecurity = false;
  if (handlers.length > 1) {
    for (const handler of handlers) {
      if (!handler.swagger && handler.toString().includes("authenticateTokenMiddleware")) {
        useJWTSecurity = true;
      }
    }
  }

  function applySecurity(spec) {
    if (useJWTSecurity) {
      spec.security = securityJwt;
    } else {
      spec.security = securityApi;
    }
    return spec;
  }

  return {
    "spec": applySecurity(handlers[handlers.length - 1].getSpec()),
    "action": function _action(req, res) {
      let i = 0;
      function callNextHandler(err) {
        if (err) {
          errorHandler(res, console)(err);
          return;
        }
        const handler = handlers[i];
        if (i === handlers.length - 1) {
          handler.handler(req, res);
        } else {
          i++;
          handler(req, res, callNextHandler);
        }
      }
      callNextHandler();
    }
  };
}

module.exports = swaggerRequestHandler;
