"use strict";

describe("register", () => {
  const registerModules = require("../index.js").registerModules;
  const expect = require("chai").expect;

  it("should run without problems even when some of the folders don't have the right structure", () => {
    registerModules(`${__dirname}/test-register/modules`, {
      logger: console,
      models: {models: "hkasdjhasd"},
      swagger: {
        addModels(models) {
          expect(models.models).to.be.eql({
            "module1": {},
            "module2": {}
          });
        }
      }
    });
  });
});
