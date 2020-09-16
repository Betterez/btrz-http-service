describe("LexiconsCommands", () => {
  const expect = require("chai").expect;
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
      expect(results[0].accountId).to.be.eql(accountId);
      expect(results[0].key).to.be.eql(lexiconEntries.name.key);
      expect(results[0].values).to.be.eql(lexiconEntries.name.values);
      expect(results[0].context).to.be.eql(defaultContext());

      expect(results[1].accountId).to.be.eql(accountId);
      expect(results[1].key).to.be.eql(lexiconEntries.last.key);
      expect(results[1].values).to.be.eql(lexiconEntries.last.values);
      expect(results[0].context).to.be.eql(defaultContext());
    });

    it("should throw if context is not an array", () => {
      function sut() {
        generatePayload(accountId, lexiconEntries, "extra");
      }
      expect(sut).to.throw("CONTEXT_SHOULD_BE_AN_ARRAY");
    });

    it("should add the context to the default ones", () => {
      const results = generatePayload(accountId, lexiconEntries, ["websales", "extra", "more", "app"]);
      expect(results[0].context).to.eql(defaultContext().concat(["extra", "more"]));
      expect(results[1].context).to.eql(defaultContext().concat(["extra", "more"]));
    });

    it("should not duplicate contexts", () => {
      const results = generatePayload(accountId, lexiconEntries, ["vue"]);
      expect(results[0].context).to.eql(defaultContext());
      expect(results[1].context).to.eql(defaultContext());
    });
  });
});
