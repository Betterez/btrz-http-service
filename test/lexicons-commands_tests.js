const {describe, it} = require("node:test");
const assert = require("node:assert/strict");

describe("LexiconsCommands", () => {
  const Chance = require("chance").Chance;
  const chance = new Chance();
  const {
    generatePayload,
    defaultContext
  } = require("../lib/lexicons-commands");

  describe("Given a lexicon post", () => {
    const accountId = chance.guid();
    const lexiconEntries = {
      name: {
        key: chance.guid(),
        values: {
          "en-us": chance.word(),
          "fr-fr": chance.word(),
          "de-de": chance.word(),
          "nl-nl": chance.word(),
          "es-ar": chance.word()
        }
      },
      last: {
        key: chance.guid(),
        values: {
          "en-us": chance.word(),
          "fr-fr": chance.word(),
          "de-de": chance.word(),
          "nl-nl": chance.word(),
          "es-ar": chance.word()
        }
      }
    };
    it("should generate the proper payload for the api", () => {
      const results = generatePayload(accountId, lexiconEntries);
      assert.equal(results[0].accountId, accountId);
      assert.equal(results[0].key, lexiconEntries.name.key);
      assert.deepEqual(results[0].values, lexiconEntries.name.values);
      assert.deepEqual(results[0].context, defaultContext());

      assert.equal(results[1].accountId, accountId);
      assert.equal(results[1].key, lexiconEntries.last.key);
      assert.deepEqual(results[1].values, lexiconEntries.last.values);
      assert.deepEqual(results[0].context, defaultContext());
    });

    it("should throw if context is not an array", () => {
      function sut() {
        generatePayload(accountId, lexiconEntries, "extra");
      }
      assert.throws(sut, /CONTEXT_SHOULD_BE_AN_ARRAY/);
    });

    it("should add the context to the default ones", () => {
      const results = generatePayload(accountId, lexiconEntries, ["websales", "extra", "more", "app"]);
      assert.deepEqual(results[0].context, defaultContext().concat(["extra", "more"]));
      assert.deepEqual(results[1].context, defaultContext().concat(["extra", "more"]));
    });

    it("should not duplicate contexts", () => {
      const results = generatePayload(accountId, lexiconEntries, ["vue"]);
      assert.deepEqual(results[0].context, defaultContext());
      assert.deepEqual(results[1].context, defaultContext());
    });
  });
});
