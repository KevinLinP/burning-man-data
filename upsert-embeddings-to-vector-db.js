import { Pinecone } from "@pinecone-database/pinecone";
import { FieldValue } from "firebase-admin/firestore";
import _ from "lodash";

import { loadCamps } from "./lib/load-data.js";
import { initializeFirestoreDb } from "./lib/firebase.js";

const NUM_BATCHES = 1000;
// limited to 30 by Firestore's 'in' query
const BATCH_SIZE = 30;

const ID_LENGTH_LIMIT = 512;

const upsertEmbeddingsToVectorDb = async () => {};

// const upsertEmbeddingsToVectorDb = async () => {
//   const db = initializeFirestoreDb();
//   const campIds = Object.keys(loadCamps({ supportResumeFromIndex: true }));
//   const campIdChunks = _.chunk(campIds, BATCH_SIZE);

//   const pc = new Pinecone({
//     apiKey: process.env.PINECONE_API_KEY,
//   });
//   const index = pc.index("burning-man-data");

//   for (const ids of _.take(campIdChunks, NUM_BATCHES)) {
//     await upsertCampEmbeddingsChunk({ db, index, ids });
//   }
// };

// const upsertCampEmbeddingsChunk = async ({ db, index, ids }) => {
//   const campEmbeddings = await fetchCampEmbeddingsByCampUids({
//     db,
//     campUids: ids,
//   });

//   for (const [id, campEmbedding] of Object.entries(campEmbeddings)) {
//     if (campEmbedding.data().indexedAt) continue;

//     const campVectors = generateCampVectors({ campEmbedding });
//     await index.upsert(campVectors);
//     await campEmbedding.ref.set(
//       { indexedAt: FieldValue.serverTimestamp() },
//       { merge: true }
//     );
//     console.log(id, campVectors.length);
//   }
// };

// const fetchCampEmbeddingsByCampUids = async ({ db, campUids }) => {
//   const querySnapshot = await db
//     .collection("campEmbeddings")
//     .where("campUid", "in", campUids)
//     .get();
//   const entries = querySnapshot.docs.map((doc) => [doc.id, doc]);

//   return Object.fromEntries(entries);
// };

// const generateCampVectors = ({ campEmbedding }) => {
//   const data = campEmbedding.data();
//   const campId = `camp|${data.campUid}`;
//   const vectors = [];

//   if (data.name) {
//     vectors.push({
//       id: `${campId}|name`,
//       values: data.name,
//       metadata: { type: "camp", property: "name" },
//     });
//   }

//   if (data.description) {
//     vectors.push({
//       id: `${campId}|description`,
//       values: data.description,
//       metadata: { type: "camp", property: "description" },
//     });
//   }

//   if (data.descriptionPhrases) {
//     Object.entries(data.descriptionPhrases).forEach(([phrase, embedding]) => {
//       vectors.push({
//         id: `${campId}|descriptionPhrase|${utf8ToAsciiEscape(
//           phrase
//         )}`.substring(0, ID_LENGTH_LIMIT),
//         values: embedding,
//         metadata: { type: "camp", property: "descriptionPhrase" },
//       });
//     });
//   }

//   return vectors;
// };

// copied from phind.com
const utf8ToAsciiEscape = (str) => {
  // Match characters that are not within the ASCII range (0-127)
  const regex = /[\x7f-\uffff]/g;
  // Replacer function to convert matched characters to their Unicode escape sequence
  const replacer = (match) => {
    const charCode = match.charCodeAt(0);
    return `\\u${charCode.toString(16).padStart(4, "0")}`;
  };
  // Replace all matched characters with their Unicode escape sequence
  return str.replace(regex, replacer);
};

upsertEmbeddingsToVectorDb();
