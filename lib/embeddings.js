const { VoyageAIClient } = require('voyageai');

const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });

/**
 * Embed an array of texts using Voyage AI.
 * @param {string[]} texts
 * @param {"document"|"query"} inputType
 * @returns {Promise<number[][]>} array of embedding vectors
 */
async function embedTexts(texts, inputType = 'document') {
  const result = await voyage.embed({
    input: texts,
    model: 'voyage-3',
    inputType,
  });
  return result.data.map(d => d.embedding);
}

/**
 * Embed a single query string (uses "query" input type for asymmetric search).
 * @param {string} text
 * @returns {Promise<number[]>} embedding vector
 */
async function embedQuery(text) {
  const vectors = await embedTexts([text], 'query');
  return vectors[0];
}

module.exports = { embedTexts, embedQuery };
