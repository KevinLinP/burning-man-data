import OpenAI from "openai";

export const getEmbedding = async ({ text }) => {
  const openai = new OpenAI();

  const response = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
    encoding_format: "float",
  });
  const embedding = response.data[0];

  return embedding.embedding;
};
