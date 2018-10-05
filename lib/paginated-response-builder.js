"use strict";

const querystring = require("querystring");

class PaginatedResponseBuilder {

  static buildResponse(result, query, totalRecords, pageSize, baseUrl) {
    const nextAndPrevUrls = PaginatedResponseBuilder.getNextAndPrevUrls(baseUrl, query, totalRecords, pageSize);
    return Object.assign(result, nextAndPrevUrls, {count: totalRecords});
  }

  static getNextAndPrevUrls(baseUrl, query, totalRecords, pageSize) {
    const queryParams = Object.assign({}, query),
      currentPage = queryParams.page;
    Reflect.deleteProperty(queryParams, "page");

    let next = "", 
      previous = "";

    if (currentPage) {
      const queryParamsString = querystring.stringify(queryParams);
      if (currentPage > 0 && totalRecords > currentPage * pageSize) {
        next = `${baseUrl}?page=${currentPage + 1}&${queryParamsString}`;
      }
      if (currentPage > 1) {
        previous = `${baseUrl}?page=${currentPage - 1}&${queryParamsString}`;
      }
    }

    return {next, previous};
  }
}

module.exports = PaginatedResponseBuilder;
