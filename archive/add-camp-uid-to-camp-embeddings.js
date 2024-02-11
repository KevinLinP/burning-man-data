import { initializeFirestoreDb } from "../lib/firebase.js";

const LIMIT = 50;

const fetchCollection = async ({ db, collectionName }) => {
  const querySnapshot = await db.collection(collectionName).limit(LIMIT).get();
  const entries = querySnapshot.docs.map((doc) => [doc.id, doc]);

  return Object.fromEntries(entries);
};

const addCampUidToCampEmbeddings = async () => {
  const db = initializeFirestoreDb();
  const campEmbeddings = await fetchCollection({
    db,
    collectionName: "campEmbeddings",
  });

  for (const [id, campEmbedding] of Object.entries(campEmbeddings)) {
    // delete camp property
    const result = await campEmbedding.ref.update(
      { campUid: id },
      { merge: true }
    );

    console.log(id, result);
  }
};

addCampUidToCampEmbeddings();
