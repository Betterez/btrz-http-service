
function defaultContext() {
  return ["app", "websales", "vue"];
}

function buildContext(context) {
  if (Array.isArray(context)) {
    const s = new Set(defaultContext().concat(context));
    return Array.from(s.keys());
  }
  throw new Error("CONTEXT_SHOULD_BE_AN_ARRAY");
}

function generatePayload(accountId, lexiconEntries, context = []) {
  const props = Object.keys(lexiconEntries);
  const result = (props || []).map((p) => {
    return {
      accountId,
      key: lexiconEntries[p].key,
      values: lexiconEntries[p].values,
      context: buildContext(context)
    };
  });
  return result || [];
}

async function saveOrUpdate(apiClient, xApiKey, jwtToken, entries) {
  try {
    const results = await apiClient.accounts.lexicons.createOrUpdateMany({
      token: xApiKey,
      jwtToken,
      entries
    });
    return results.data;
  } catch (e) {
    throw new Error("ERROR_SAVING_LEXICON_ENTRIES");
  }
}

module.exports = {
  generatePayload,
  defaultContext,
  saveOrUpdate
};
