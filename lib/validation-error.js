"use strict";

function ValidationError (message, statusCodeOverride) {
  this.constructor.prototype.__proto__ = Error.prototype;
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  this.status = statusCodeOverride || 400;
}

module.exports = ValidationError;