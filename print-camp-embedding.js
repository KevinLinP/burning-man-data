import { initializeFirestoreDb } from "./lib/firebase.js";

const printCampEmbedding = async () => {
  const id = process.argv[2];

  const db = initializeFirestoreDb();
  const ref = db.collection("campEmbeddings").doc(id);

  const doc = await ref.get();
  console.log(doc.data());
};

printCampEmbedding();
