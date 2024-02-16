import { initializeFirestoreDb } from "../lib/firebase.js";
import { FieldValue } from "firebase-admin/firestore";

const LIMIT = 50;

const fetchCollection = async ({ db, collectionName }) => {
  const querySnapshot = await db.collection(collectionName).limit(LIMIT).get();
  const entries = querySnapshot.docs.map((doc) => [doc.id, doc]);

  return Object.fromEntries(entries);
};

const deleteCampRefs = async () => {
  const db = initializeFirestoreDb();
  const campEmbeddings = await fetchCollection({
    db,
    collectionName: "campEmbeddings",
  });

  for (const [id, campEmbedding] of Object.entries(campEmbeddings)) {
    // delete camp property
    const result = await campEmbedding.ref.update(
      { camp: FieldValue.delete() },
      { merge: true }
    );

    console.log(id, result);
  }
};

deleteCampRefs();
