/*jshint expr: true */
"use strict";

describe("Paginated Response Builder", function () {

  const PaginatedResponseBuilder = require("../index.js").PaginatedResponseBuilder,
    expect = require("chai").expect;

  describe("#getNextAndPrevUrls()", function () {

    it("should return defaults", function () {
      let result = PaginatedResponseBuilder.getNextAndPrevUrls();
      expect(result).to.deep.equal({next: "", previous: ""});
    });

    it("should build next url from first page", function () {
      let query = {
            "page": 1,
            "filter1": "one",
            "filter2": "two three"
          },
          pageSize = 5,
          totalRecords = 10,
          url = "http://localhost:3010/inventory/test";
      let result = PaginatedResponseBuilder.getNextAndPrevUrls(url, query, totalRecords, pageSize);
      expect(result).to.deep.equal({
        next: "http://localhost:3010/inventory/test?page=2&filter1=one&filter2=two%20three",
        previous: ""
      });
    });

    it("should build previous url from last page", function () {
      let query = {
            "page": 2,
            "filter1": "one",
            "filter2": "two three"
          },
          pageSize = 5,
          totalRecords = 10,
          url = "http://localhost:3010/inventory/test";
      let result = PaginatedResponseBuilder.getNextAndPrevUrls(url, query, totalRecords, pageSize);
      expect(result).to.deep.equal({
        next: "",
        previous: "http://localhost:3010/inventory/test?page=1&filter1=one&filter2=two%20three",
      });
    });

    it("should build next and previous url from middle page", function () {
      let query = {
            "page": 2,
            "filter1": "one",
            "filter2": "two three"
          },
          pageSize = 5,
          totalRecords = 15,
          url = "http://localhost:3010/inventory/test";
      let result = PaginatedResponseBuilder.getNextAndPrevUrls(url, query, totalRecords, pageSize);
      expect(result).to.deep.equal({
        next: "http://localhost:3010/inventory/test?page=3&filter1=one&filter2=two%20three",
        previous: "http://localhost:3010/inventory/test?page=1&filter1=one&filter2=two%20three",
      });
    });
  });

  describe("#buildResponse()", function () {

    it("should return defaults", function () {
      let results = {data: [1, 2, 3]},
          query = {},
          count = 3;
      let result = PaginatedResponseBuilder.buildResponse(results, query, count);
      expect(result).to.deep.equal({
        data: [1, 2, 3],
        count: 3,
        next: "",
        previous: ""
      });
    });

    it("should include next and previous urls", function () {
      let query = {
            "page": 2,
            "filter1": "one",
            "filter2": "two three"
          },
          pageSize = 5,
          totalRecords = 15,
          url = "http://localhost:3010/inventory/test";
      let results = {data: [1, 2, 3]};
      let result = PaginatedResponseBuilder.buildResponse(results, query, totalRecords, pageSize, url);
      expect(result).to.deep.equal({
        data: [1, 2, 3],
        count: 15,
        next: "http://localhost:3010/inventory/test?page=3&filter1=one&filter2=two%20three",
        previous: "http://localhost:3010/inventory/test?page=1&filter1=one&filter2=two%20three",
      });
    });
  });
});