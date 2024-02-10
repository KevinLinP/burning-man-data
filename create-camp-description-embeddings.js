import { initializeFirestoreDb } from "./lib/firebase.js";
import { getEmbedding } from "./lib/openai.js";

const LIMIT = 50;

const fetchCollection = async ({ db, collectionName }) => {
  const querySnapshot = await db.collection(collectionName).limit(LIMIT).get();
  const entries = querySnapshot.docs.map((doc) => [doc.id, doc]);

  return Object.fromEntries(entries);
};

const fetchCampEmbedding = async ({ db, camp }) => {
  const docRef = db.collection("campEmbeddings").doc(camp.id);
  return await docRef.get();
};

const run = async () => {
  const db = initializeFirestoreDb();
  const camps = await fetchCollection({ db, collectionName: "camps" });

  let index = -1;
  for (const [_id, camp] of Object.entries(camps)) {
    index++;
    const logData = [
      index.toString().padStart(4, "0"),
      camp.id,
      camp.data().name,
    ];
    const campDescription = camp.data().description;
    if (!campDescription || campDescription.length == 0) {
      console.log(...logData, "BLANK");
      continue;
    }

    const campEmbedding = await fetchCampEmbedding({ db, camp });

    if (campEmbedding.exists && campEmbedding.data().description) {
      console.log(...logData, "skip");
    } else {
      const embedding = await getEmbedding({ text: campDescription });
      campEmbedding.ref.set({ camp: camp.ref, description: embedding });
      console.log(...logData, campDescription);
    }
  }
};

run();
