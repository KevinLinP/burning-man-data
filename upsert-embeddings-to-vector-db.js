import { Pinecone } from "@pinecone-database/pinecone";
import { FieldValue } from "firebase-admin/firestore";
import _ from "lodash";

import { loadCamps } from "./lib/load-data.js";
import { initializeFirestoreDb } from "./lib/firebase.js";

const NUM_BATCHES = 1000;
// limited to 30 by Firestore's 'in' query
const BATCH_SIZE = 30;

const ID_LENGTH_LIMIT = 512;

const NAMESPACE = "2024-02-11";
const lastIndexedAt = new Date("2024-02-12T04:56:43.242Z");
const VECTORS_WRITE_AT = 90;

const upsertEmbeddingsToVectorDb = async () => {
  const db = initializeFirestoreDb();
  const bulkWriter = db.bulkWriter();

  const camps = loadCamps({ supportResumeFromIndex: true });
  const campIds = Object.keys(camps);
  const campIdChunks = _.chunk(campIds, BATCH_SIZE);

  const namespace = getNamespace();

  for (const ids of _.take(campIdChunks, NUM_BATCHES)) {
    const campEmbeddings = await fetchCampEmbeddingsByCampUids({
      db,
      campUids: ids,
    });

    let vectorsToWrite = [];
    let campEmbeddingsToWrite = [];
    let vectorCounts = {};

    for (const [id, campEmbedding] of Object.entries(campEmbeddings)) {
      const indexedAt = campEmbedding.data().indexedAt;
      if (indexedAt && indexedAt.toDate() > lastIndexedAt) continue;

      const campVectors = generateCampVectors({ campEmbedding });
      vectorCounts[id] = campVectors.length;
      vectorsToWrite = [...vectorsToWrite, ...campVectors];
      campEmbeddingsToWrite.push(campEmbedding);

      if (vectorsToWrite.length >= VECTORS_WRITE_AT) {
        await flushWrites({
          namespace,
          bulkWriter,
          campEmbeddingsToWrite,
          vectorCounts,
          vectorsToWrite,
        });
      }
    }

    if (vectorsToWrite.length > 0) {
      await flushWrites({
        namespace,
        bulkWriter,
        campEmbeddingsToWrite,
        vectorCounts,
        vectorsToWrite,
      });
    }
  }

  bulkWriter.close();
};

const flushWrites = async ({
  namespace,
  bulkWriter,
  campEmbeddingsToWrite,
  vectorCounts,
  vectorsToWrite,
}) => {
  await namespace.upsert(vectorsToWrite);
  vectorsToWrite.length = 0;

  campEmbeddingsToWrite.forEach((campEmbedding) => {
    bulkWriter
      .set(
        campEmbedding.ref,
        { indexedAt: FieldValue.serverTimestamp() },
        { merge: true }
      )
      .then(() => {
        const campIndex = campEmbedding.data().campIndex;
        const indexString = campIndex && campIndex.toString().padStart(4, "0");

        console.log(
          indexString,
          campEmbedding.id,
          vectorCounts[campEmbedding.id]
        );
      });
  });
  campEmbeddingsToWrite.length = 0;
};

const getNamespace = () => {
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  const index = pc.index("burning-man-data");
  return index.namespace(NAMESPACE);
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
      metadata: { type: "camp", property: "name" },
    });
  }

  if (data.description) {
    vectors.push({
      id: `${campId}|description`,
      values: data.description,
      metadata: { type: "camp", property: "description" },
    });
  }

  if (data.descriptionOfferings) {
    Object.entries(data.descriptionOfferings).forEach(([text, embedding]) => {
      const escapedText = utf8ToAsciiEscape(text);
      let id = `${campId}|descriptionOffering|${escapedText}`;
      id = id.substring(0, ID_LENGTH_LIMIT);
      vectors.push({
        id,
        values: embedding,
        metadata: { type: "camp", property: "descriptionOffering" },
      });
    });
  }

  return vectors;
};

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
