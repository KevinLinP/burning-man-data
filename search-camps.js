import { Pinecone } from "@pinecone-database/pinecone";
import _ from "lodash";

import { getEmbedding } from "./lib/openai.js";
import { loadCamps } from "./lib/load-data.js";

const searchCamps = async ({ query }) => {
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  const index = pc.index("burning-man-data");

  const camps = loadCamps();

  const queryEmbedding = await getEmbedding({ text: query });
  const queryResponse = await index.query({
    vector: queryEmbedding,
    topK: 25,
  });
  console.log("usage", queryResponse.usage);
  console.log("");

  const campUidsAndScores = queryResponse.matches.reduce((camps, match) => {
    const campId = match.id.split("|")[1];
    if (camps[campId]) {
      return camps;
    } else {
      const score = match.score;
      return { ...camps, [campId]: score };
    }
  }, {});

  const campStrings = Object.entries(campUidsAndScores).map(
    ([campId, score], i) => {
      const camp = camps[campId];
      let string = `${i + 1}. ${camp.name} (${score}) ${camp.uid}`;
      if (camp.description) {
        string += `\n${camp.description}`;
      }
      return string;
    }
  );

  console.log(_.take(campStrings, 10).join("\n\n"));
  console.log("");
};

const query = process.argv.slice(2).join(" ");
searchCamps({ query });
