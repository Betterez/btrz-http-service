module.exports = {
  OBJECT_ID_PATTERN_REGEXP: /\b[0-9A-F]{24}\b/i,
  DATE_MMDDYYYY_PATTERN_REGEXP: /^(1[0-2]|0[1-9])\/(3[01]|[12][0-9]|0[1-9])\/[0-9]{4}$/,
  DATE_YYYY_MM_DD_PATTERN_REGEXP: /^[0-9]{4}-(1[0-2]|0[1-9])-(3[01]|[12][0-9]|0[1-9])$/,
  TIME_HHMM_PATTERN_REGEXP: /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/,
  UUID4_PATTERN_REGEXP: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  OBJECT_ID_PATTERN_STRING: "^[0-9a-f]{24}$",
  DATE_MMDDYYYY_PATTERN_STRING: "^(1[0-2]|0[1-9])\/(3[01]|[12][0-9]|0[1-9])\/[0-9]{4}$",
  DATE_YYYY_MM_DD_PATTERN_STRING: "^[0-9]{4}-(1[0-2]|0[1-9])-(3[01]|[12][0-9]|0[1-9])$",
  TIME_HHMM_PATTERN_STRING: "^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$",
  UUID4_PATTERN_STRING: "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
};
