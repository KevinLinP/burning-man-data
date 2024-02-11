import { loadCamps } from "./lib/load-data.js";
import { initializeFirestoreDb } from "./lib/firebase.js";
import { getEmbedding } from "./lib/openai.js";
import _ from "lodash";

const NUM_BATCHES = 1;
// limited to 30 by Firestore's 'in' query
const BATCH_SIZE = 30;

const fetchCampEmbeddingsByCampUids = async ({ db, campUids }) => {
  const querySnapshot = await db
    .collection("campEmbeddings")
    .where("campUid", "in", campUids)
    .get();
  const entries = querySnapshot.docs.map((doc) => [doc.id, doc]);

  return Object.fromEntries(entries);
};

const upsertCampEmbeddings = async () => {
  const db = initializeFirestoreDb();
  const camps = loadCamps();
  const campChunks = _.chunk(Object.values(camps), BATCH_SIZE);

  for (let i = 0; i < Math.min(NUM_BATCHES, campChunks.length); i++) {
    await upsertCampEmbeddingsChunk({ db, chunk: campChunks[i] });
  }
};

const upsertCampEmbeddingsChunk = async ({ db, chunk }) => {
  const campUids = chunk.map((camp) => camp.uid);
  const campEmbeddings = await fetchCampEmbeddingsByCampUids({
    db,
    campUids,
  });

  for (const camp of chunk) {
    const campEmbedding = campEmbeddings[camp.uid];
    const currentCampEmbeddingData = campEmbedding?.data() || {};

    const newCampEmbeddingData = {
      campUid: camp.uid,
      name: await setEmbedding({
        text: camp.name,
        currentEmbedding: currentCampEmbeddingData.name,
      }),
      description: await setEmbedding({
        text: camp.description,
        currentEmbedding: currentCampEmbeddingData.description,
      }),
    };

    if (_.isMatch(currentCampEmbeddingData, newCampEmbeddingData)) continue;

    const ref =
      campEmbedding?.ref || db.collection("campEmbeddings").doc(camp.uid);

    console.log("ref.set", ref.id, Object.keys(newCampEmbeddingData));
    await ref.set(newCampEmbeddingData, { merge: true });
  }
};

const setEmbedding = async ({ text, currentEmbedding }) => {
  if (currentEmbedding != undefined) return currentEmbedding;
  if (!text || text.length == 0) return null;

  console.log("getEmbedding", text);
  return await getEmbedding({ text });
};

upsertCampEmbeddings();
