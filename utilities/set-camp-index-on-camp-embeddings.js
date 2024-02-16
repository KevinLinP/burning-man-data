import _ from "lodash";

import { loadCamps } from "../lib/load-data.js";
import { initializeFirestoreDb } from "../lib/firebase.js";

const LIMIT = 10000;

const setCampIndexOnCampEmbeddings = async () => {
  const camps = Object.values(loadCamps({ supportResumeFromIndex: true }));
  const db = initializeFirestoreDb();

  const collectionRef = db.collection("campEmbeddings");
  const bulkWriter = db.bulkWriter();

  _.take(camps, LIMIT).forEach((camp) => {
    const docRef = collectionRef.doc(camp.uid);
    bulkWriter.set(docRef, { campIndex: camp.index }, { merge: true });
  });

  await bulkWriter.close();
};

setCampIndexOnCampEmbeddings();
