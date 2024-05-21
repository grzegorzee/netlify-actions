import { getEncoding } from 'js-tiktoken';

const countTokens = (text) => {
  const encoding = getEncoding('cl100k_base');
  return encoding.encode(text).length;
};

const split = (text, size = 500, estimateTokens = false) => {
  const documents = [];
  let document = '';
  let currentSize = 0;

  // Splitting logic adjusted to consider single lines if `\n\n` not present.
  const delimiter = text.includes('\n\n') ? '\n\n' : ' ';
  const chunks = text.split(delimiter);

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;

    const chunkSize = estimateTokens ? countTokens(chunk) : chunk.length;
    currentSize += chunkSize;

    if (currentSize > size && document.trim()) {
      documents.push({ chunk: document.trim() });
      document = chunk;
      currentSize = chunkSize; // Reset currentSize to the size of the new chunk
    } else {
      document += (document ? delimiter : '') + chunk;
    }
  }

  if (document.trim()) {
    documents.push({ chunk: document.trim() });
  }

  return documents;
};

const handler = async (event, context) => {
  const { headers } = event;
  if (!headers.authorization || headers.authorization !== process.env.AUTH_TOKEN) {
    return {
      headers: {
        'Content-Type': 'application/json'
      },
      statusCode: 401,
      body: JSON.stringify({ message: "Unauthorized" }),
    };
  }
  const { text, size, estimateTokens } = JSON.parse(event.body);
  const documents = split(text, size, estimateTokens);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(documents),
  };
};

export { handler };