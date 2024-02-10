import fs from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import serviceAccountKey from "./serviceAccountKey.json" assert { type: "json" };

const parseCamps = () => {
  const fileString = fs.readFileSync("data/2022-camps.json");
  return JSON.parse(fileString);
};

const initializeFirebaseDb = () => {
  initializeApp({
    credential: cert(serviceAccountKey),
  });

  return getFirestore();
};

const bulkWriteCamps = async ({ camps, db }) => {
  const firestore = db;
  let bulkWriter = firestore.bulkWriter();

  camps.forEach((camp) => {
    const docRef = firestore.collection("camps").doc(camp.uid);
    bulkWriter.create(docRef, camp);
  });

  await bulkWriter.close();
};

const getCampCount = async ({ db }) => {
  const collectionRef = db.collection("camps");
  const snapshot = await collectionRef.count().get();
  return snapshot.data().count;
};

const run = async () => {
  const db = initializeFirebaseDb();
  const camps = parseCamps();

  const campsLength = camps.length;
  const campCountBefore = await getCampCount({ db });
  console.log({ campCountBefore, campsLength });

  await bulkWriteCamps({ camps, db });

  const campsCountAfter = await getCampCount({ db });
  console.log({ campsCountAfter });
};

run();
