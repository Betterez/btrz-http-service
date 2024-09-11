const errorHandler = require("./http-response-handlers").error;

async function runMiddleware(req, res, middleware) {
  await new Promise((resolve, reject) => {
    middleware(req, res, (error) => {
      error ? reject(error) : resolve();
    });
  });
}

// accepts "multiple callback functions that behave just like middleware"
// like in Express, their signature must be (req, res, next)
// last argument must always be a Handler class instance,
// that implements getSpec() and handler(req, res)
function swaggerRequestHandler(...args) {
  const securityJwt = [
    {
      "ApiKeyAuth": [],
      "JwtAuth": []
    }];
  const securityApi = [
    {
      "ApiKeyAuth": []
    }];
  const securityBasic = [
    {
      "ApiKeyAuth": [],
      "BasicAuth": []
    }];
  const handlers = args;
  let useJWTSecurity = false;
  let useBasicSecurity = false;
  if (handlers.length > 1) {
    for (const handler of handlers) {
      if (!handler.swagger && handler.toString().includes("authenticateTokenMiddleware")) {
        useJWTSecurity = true;
      } else if (!handler.swagger && handler.toString().includes("authenticate(")) {
        useBasicSecurity = true;
      }
    }
  }

  function applySecurity(spec) {
    if (useJWTSecurity) {
      spec.security = securityJwt;
    } else if (useBasicSecurity) {
      spec.security = securityBasic;
    } else {
      spec.security = securityApi;
    }
    return spec;
  }

  const middlewares = handlers.slice(0, -1);
  const endpointHandler = handlers.slice(-1)[0];
  const endpointSpec = endpointHandler.getSpec?.() ?? endpointHandler.constructor.getSpec?.(); // Support static or instance methods

  return {
    "spec": applySecurity(endpointSpec),
    "action": async function (req, res) {
      try {
        for (const middleware of middlewares) {
          await runMiddleware(req, res, middleware);
        }

        await endpointHandler.handler(req, res);
      } catch (error) {
        errorHandler(res, console)(error);
        return;
      }
    }
  };
}

module.exports = swaggerRequestHandler;
