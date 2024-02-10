import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const initializeFirestoreDb = () => {
  initializeApp({
    credential: cert("./serviceAccountKey.json"),
  });

  return getFirestore();
};
