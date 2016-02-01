"use strict";

// accepts "multiple callback functions that behave just like middleware"
// like in Express, their signature must be (req, res, next)
// last argument must always be a Handler class instance,
// that implements getSpec() and handler(req, res)
let swaggerRequestHandler = function () {
  let handlers = arguments;
  return {
    "spec": handlers[handlers.length-1].getSpec(),
    "action": function (req, res) {
      let i = 0;
      function callNextHandler () {
        let handler = handlers[i];
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
};

module.exports = swaggerRequestHandler;