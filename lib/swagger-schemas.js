module.exports = {
  bzDate: {
    "id": "BzDate",
    "required": ["value", "offset"],
    "properties": {
      "value": {
        "type": "string",
        "description": "The date value"
      },
      "offset": {
        "type": "integer",
        "description": "Deprecated"
      }
    }
  },
  lexiconKeyValues: {
    id: "lexiconKeyValues",
    type: "object",
    required: ["key", "values"],
    description: "The lexicon key values.",
    properties: {
      "key": {
        "type": "string",
        "description": "The lexicon key"
      },
      "values": {
        "type": "object",
        "description": "The lexicon values",
        "$ref": "lexiconValues"
      }
    }
  },
  lexiconValues: {
    id: "lexiconValues",
    type: "object",
    required: ["en-us"],
    description: "The lexicon values.",
    properties: {
      "en-us": {
        "type": "string",
        "description": "The lexicon value for en-us"
      },
      "fr-fr": {
        "type": "string",
        "description": "The lexicon value for fr-fr"
      },
      "de-de": {
        "type": "string",
        "description": "The lexicon value for de-de"
      },
      "nl-nl": {
        "type": "string",
        "description": "The lexicon value for nl-nl"
      },
      "es-ar": {
        "type": "string",
        "description": "The lexicon value for es-ar"
      }
    }
  },
  errorResponse: {
    "id": "ErrorResponse",
    "required": ["code", "message"],
    "properties": {
      "code": {
        "type": "string",
        "description": "A string identifying the specific error."
      },
      "message": {
        "type": "string",
        "description": "English description of the error, usually including some information on what caused the error"
      }
    }
  },
  defaultPagingProps: {
    "next": {
      "type": "string",
      "description": "A URL pointing to the next page of results.  If no more results are available, this will be an empty string."
    },
    "previous": {
      "type": "string",
      "description": "A URL pointing to the previous page of results.  If no previous results are available " +
        "(ie. you are already viewing the first page of results), this will be an empty string."
    },
    "count": {
      "type": "integer",
      "format": "int32",
      "description": "The total number of results returned by your query, across all pages."
    }
  }
};
