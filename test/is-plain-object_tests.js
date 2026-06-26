const test = require("node:test");
const assert = require("node:assert/strict");

const isPlainObject = require("../lib/is-plain-object");

test("returns true for plain objects", () => {
  assert.equal(isPlainObject({a: 1}), true);
  assert.equal(isPlainObject(Object.create(null)), true);
});

test("returns false for non-plain values", () => {
  function CustomType() {
    this.value = 1;
  }

  assert.equal(isPlainObject(new CustomType()), false);
  assert.equal(isPlainObject([]), false);
  assert.equal(isPlainObject(new Date()), false);
  assert.equal(isPlainObject(null), false);
  assert.equal(isPlainObject("text"), false);
});
