import fs from "fs";
import { initializeFirestoreDb } from "./lib/firebase";

const parseCamps = () => {
  const fileString = fs.readFileSync("data/2022-camps.json");
  return JSON.parse(fileString);
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
  const db = initializeFirestoreDb();
  const camps = parseCamps();

  const campsLength = camps.length;
  const campCountBefore = await getCampCount({ db });
  console.log({ campCountBefore, campsLength });

  await bulkWriteCamps({ camps, db });

  const campsCountAfter = await getCampCount({ db });
  console.log({ campsCountAfter });
};

run();
