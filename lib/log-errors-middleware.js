"use strict";
const mung = require("express-mung");

/* Logging responses for  */
function log(logger) {
  return function (body, req, res) {
    if (res.statusCode >= 400) {
      logger.info(`Error response ${res.statusCode}`, {
        response: body,
        "request-params": req.params,
        "request-query": req.query,
        "request-body": req.body
      });
    }
    return body;
  };
}

exports.json = function (logger) {
  return mung.json(log(logger));
};
