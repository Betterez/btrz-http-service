"use strict";

describe("Paginated Response Builder", () => {
  const PaginatedResponseBuilder = require("../index.js").PaginatedResponseBuilder;
  const expect = require("chai").expect;

  describe("#getNextAndPrevUrls()", () => {
    it("should return defaults", () => {
      const result = PaginatedResponseBuilder.getNextAndPrevUrls();
      expect(result).to.deep.equal({next: "", previous: ""});
    });

    it("should build next url from first page", () => {
      const query = {
        "page": 1,
        "filter1": "one",
        "filter2": "two three"
      };
      const pageSize = 5;
      const totalRecords = 10;
      const url = "http://localhost:3010/inventory/test";
      const result = PaginatedResponseBuilder.getNextAndPrevUrls(url, query, totalRecords, pageSize);
      expect(result).to.deep.equal({
        next: "http://localhost:3010/inventory/test?page=2&filter1=one&filter2=two%20three",
        previous: ""
      });
    });

    it("should build previous url from last page", () => {
      const query = {
        "page": 2,
        "filter1": "one",
        "filter2": "two three"
      };
      const pageSize = 5;
      const totalRecords = 10;
      const url = "http://localhost:3010/inventory/test";
      const result = PaginatedResponseBuilder.getNextAndPrevUrls(url, query, totalRecords, pageSize);
      expect(result).to.deep.equal({
        next: "",
        previous: "http://localhost:3010/inventory/test?page=1&filter1=one&filter2=two%20three",
      });
    });

    it("should build next and previous url from middle page", () => {
      const query = {
        "page": 2,
        "filter1": "one",
        "filter2": "two three"
      };
      const pageSize = 5;
      const totalRecords = 15;
      const url = "http://localhost:3010/inventory/test";
      const result = PaginatedResponseBuilder.getNextAndPrevUrls(url, query, totalRecords, pageSize);
      expect(result).to.deep.equal({
        next: "http://localhost:3010/inventory/test?page=3&filter1=one&filter2=two%20three",
        previous: "http://localhost:3010/inventory/test?page=1&filter1=one&filter2=two%20three",
      });
    });
  });

  describe("#buildResponse()", () => {
    it("should return defaults", () => {
      const results = {
        data: [1, 2, 3]
      };
      const query = {};
      const count = 3;
      const result = PaginatedResponseBuilder.buildResponse(results, query, count);
      expect(result).to.deep.equal({
        data: [1, 2, 3],
        count: 3,
        next: "",
        previous: ""
      });
    });

    it("should include next and previous urls", () => {
      const query = {
        "page": 2,
        "filter1": "one",
        "filter2": "two three"
      };
      const pageSize = 5;
      const totalRecords = 15;
      const url = "http://localhost:3010/inventory/test";
      const results = {data: [1, 2, 3]};
      const result = PaginatedResponseBuilder.buildResponse(results, query, totalRecords, pageSize, url);
      expect(result).to.deep.equal({
        data: [1, 2, 3],
        count: 15,
        next: "http://localhost:3010/inventory/test?page=3&filter1=one&filter2=two%20three",
        previous: "http://localhost:3010/inventory/test?page=1&filter1=one&filter2=two%20three",
      });
    });
  });
});
