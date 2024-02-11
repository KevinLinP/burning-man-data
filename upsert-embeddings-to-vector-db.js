import { Pinecone } from "@pinecone-database/pinecone";
import { loadCamps } from "./lib/load-data.js";
import { initializeFirestoreDb } from "./lib/firebase.js";
import _ from "lodash";

const NUM_BATCHES = 1;
// limited to 30 by Firestore's 'in' query
const BATCH_SIZE = 1;

const upsertEmbeddingsToVectorDb = async () => {
  const db = initializeFirestoreDb();
  const campIds = Object.keys(loadCamps());
  const campIdChunks = _.chunk(campIds, BATCH_SIZE);

  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  const index = pc.index("burning-man-data");

  for (const ids of _.take(campIdChunks, NUM_BATCHES)) {
    await upsertCampEmbeddingsChunk({ db, index, ids });
  }
};

const upsertCampEmbeddingsChunk = async ({ db, index, ids }) => {
  const campEmbeddings = await fetchCampEmbeddingsByCampUids({
    db,
    campUids: ids,
  });

  for (const id of ids) {
    const campEmbedding = campEmbeddings[id];
    const campVectors = generateCampVectors({ campEmbedding });
    console.log(id, campEmbedding, campVectors);
  }
};

const fetchCampEmbeddingsByCampUids = async ({ db, campUids }) => {
  const querySnapshot = await db
    .collection("campEmbeddings")
    .where("campUid", "in", campUids)
    .get();
  const entries = querySnapshot.docs.map((doc) => [doc.id, doc]);

  return Object.fromEntries(entries);
};

const generateCampVectors = ({ campEmbedding }) => {
  const data = campEmbedding.data();
  const campId = `camp|${data.campUid}`;
  const vectors = [];

  if (data.name) {
    vectors.push({
      id: `${campId}|name`,
      values: data.name,
    });
  }

  if (data.description) {
    vectors.push({
      id: `${campId}|description`,
      values: data.description,
    });
  }

  if (data.descriptionPhrases) {
    Object.entries(data.descriptionPhrases).forEach(([phrase, embedding]) => {
      vectors.push({
        id: `${campId}|descriptionPhrase|${phrase}`,
        values: embedding,
      });
    });
  }

  return vectors;
};

upsertEmbeddingsToVectorDb();
