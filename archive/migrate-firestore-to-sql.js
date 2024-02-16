import { initializeFirestoreDb } from "../lib/firebase.js";
import { db } from "../lib/sql-db.js";
import { loadCamps } from "../lib/load-data.js";

const INDEX_LIMIT = 1;
const BATCH_SIZE = 1;

const migrateDocuments = async ({ camps, startIndex, firestore }) => {
  const endIndex = startIndex + BATCH_SIZE - 1;
  let embeddings = [];

  const collectionRef = firestore.collection("campEmbeddings");
  const query = collectionRef
    .where("campIndex", ">=", startIndex)
    .where("campIndex", "<=", endIndex);
  const querySnapshot = await query.get();
  const docs = querySnapshot.docs;

  console.log({ docs });

  docs.forEach((doc) => {
    embeddings = embeddings.concat(generateEmbeddings({ doc, camps }));
  });

  const result = await db("embeddings")
    .insert(embeddings)
    .onConflict(["objectType", "objectId", "property", "text"])
    .merge();
  console.log(result);
};

const generateEmbeddings = ({ doc, camps }) => {
  const camp = camps[doc.id];
  const data = doc.data();

  const commonFields = {
    objectType: "camp",
    objectId: doc.id,
    indexedAt: data.indexedAt.toDate(),
  };

  let embeddings = [
    {
      ...commonFields,
      property: "name",
      text: camp.name,
      vector: data.name,
    },
  ];

  if (camp.description) {
    embeddings.push({
      ...commonFields,
      property: "description",
      text: camp.description,
      vector: data.description,
    });
  }

  if (data.descriptionOfferings) {
    Object.entries(data.descriptionOfferings).forEach(([text, vector]) => {
      embeddings.push({
        ...commonFields,
        property: "descriptionOffering",
        text,
        vector,
      });
    });
  }

  return embeddings;
};

const run = async () => {
  const firestore = initializeFirestoreDb();
  const camps = loadCamps({ supportResumeFromIndex: false });
  const indexLimit = INDEX_LIMIT || camps.length;

  let startIndex = 0;
  while (startIndex < indexLimit) {
    await migrateDocuments({ camps, startIndex, firestore });
    startIndex += BATCH_SIZE;
  }

  db.destroy();
};

run();
