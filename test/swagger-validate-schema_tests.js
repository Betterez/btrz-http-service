const {describe, it, mock} = require("node:test");
const assert = require("node:assert/strict");

const validateSwaggerSchema = require("../lib/swagger-validate-schema");
const ValidationError = require("../lib/validation-error");

describe("validateSwaggerSchema()", () => {
  it("should return WRONG_DATA when swagger expects a required body and req.body is undefined", async () => {
    const validator = mock.fn(() => {
      return {errors: []};
    });
    const spec = {
      parameters: [
        {
          in: "body",
          name: "customReport",
          required: true
        }
      ]
    };
    const req = {};

    await assert.rejects(
      validateSwaggerSchema({validator, spec, models: {}, req}),
      (error) => {
        assert.ok(error instanceof ValidationError);
        assert.equal(error.code, "WRONG_DATA");
        assert.equal(error.message, "customReport is required");
        assert.equal(error.status, 400);
        return true;
      }
    );

    assert.strictEqual(validator.mock.callCount(), 0);
  });

  it("should not enforce body presence when no required body parameter exists", async () => {
    const validator = mock.fn(() => {
      return {errors: []};
    });
    const spec = {
      parameters: [
        {
          in: "query",
          name: "status",
          required: false
        },
        {
          in: "body",
          name: "customReport",
          required: false
        }
      ]
    };
    const req = {};

    await validateSwaggerSchema({validator, spec, models: {}, req});
    assert.strictEqual(validator.mock.callCount(), 1);
  });
});
