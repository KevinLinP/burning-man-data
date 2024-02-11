import { loadCamps } from "./lib/load-data.js";
import { initializeFirestoreDb } from "./lib/firebase.js";
import { getEmbedding } from "./lib/openai.js";
import OpenAI from "openai";
import _ from "lodash";

const NUM_BATCHES = 1000;
// limited to 30 by Firestore's 'in' query
const BATCH_SIZE = 30;

const fetchCampEmbeddingsByCampUids = async ({ db, campUids }) => {
  const querySnapshot = await db
    .collection("campEmbeddings")
    .where("campUid", "in", campUids)
    .get();
  const entries = querySnapshot.docs.map((doc) => [doc.id, doc]);

  return Object.fromEntries(entries);
};

const generateAndStoreEmbeddings = async () => {
  const db = initializeFirestoreDb();
  let camps = Object.values(loadCamps({ supportResumeFromIndex: true }));
  const campChunks = _.chunk(camps, BATCH_SIZE);

  for (const chunk of _.take(campChunks, NUM_BATCHES)) {
    const campUids = chunk.map((camp) => camp.uid);
    const campEmbeddings = await fetchCampEmbeddingsByCampUids({
      db,
      campUids,
    });

    for (const camp of chunk) {
      const campEmbedding = campEmbeddings[camp.uid];
      const ref =
        campEmbedding?.ref || db.collection("campEmbeddings").doc(camp.uid);
      const currentCampEmbeddingData = campEmbedding?.data() || {
        indexedAt: null,
      };

      let descriptionOfferingStrings =
        currentCampEmbeddingData.descriptionOfferings;

      if (!descriptionOfferingStrings) {
        descriptionOfferingStrings = await getDescriptionOfferingStrings({
          description: camp.description,
        });

        if (
          descriptionOfferingStrings &&
          descriptionOfferingStrings.length > 0
        ) {
          console.log("getDescriptionOfferingStrings", camp.uid, camp.name, [
            camp.description,
            descriptionOfferingStrings,
          ]);
        }
      }

      // keep looping without waiting
      upsertCampEmbeddings({
        ref,
        camp,
        descriptionOfferingStrings,
        currentCampEmbeddingData,
      });
    }
  }
};

const upsertCampEmbeddings = async ({
  ref,
  camp,
  descriptionOfferingStrings,
  currentCampEmbeddingData,
}) => {
  const newCampEmbeddingData = {
    campUid: camp.uid,
    name: await setEmbedding({
      text: camp.name,
      currentEmbedding: currentCampEmbeddingData.name,
    }),
    description: await setEmbedding({
      text: camp.description,
      currentEmbedding: currentCampEmbeddingData.description,
    }),
    descriptionOfferings: await setEmbeddingObj({
      strings: descriptionOfferingStrings,
      currentEmbeddings: currentCampEmbeddingData.descriptionOfferings,
    }),
  };

  if (_.isMatch(currentCampEmbeddingData, newCampEmbeddingData)) return;

  const upsertedData = Object.assign({ indexedAt: null }, newCampEmbeddingData);

  await ref.set(upsertedData, { merge: true });

  console.log(
    "ref.set",
    ref.id,
    camp.name,
    Object.keys(_.pickBy(newCampEmbeddingData, (v) => v !== null))
  );
};

const setEmbedding = async ({ text, currentEmbedding }) => {
  if (currentEmbedding != undefined) return currentEmbedding;
  if (!text || text.length == 0) return null;

  return await getEmbedding({ text });
};

const getDescriptionOfferingStrings = async ({ description }) => {
  if (!description) return null;
  if (description.length == 0) return [];

  const openai = new OpenAI();

  // link for myself:
  // https://platform.openai.com/playground/p/uf03aHVlAsVo2CVKENbmL2JJ?mode=chat
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are provided with the blurb of a camp at Burning Man.\n\nPlease provide me with the camp's public offerings as a list of phrases.\n\nPlease give me your output as a JSON array of strings.",
      },
      { role: "user", content: description },
    ],
    model: "gpt-3.5-turbo-0125",
    response_format: { type: "json_object" },
    top_p: 0.5,
  });

  const jsonString = completion.choices[0].message.content;
  const jsonObj = JSON.parse(jsonString);
  if (Object.keys(jsonObj).length !== 1) {
    throw new Error(
      `Expected a single key in the JSON object, but got ${
        Object.keys(jsonObj).length
      }`
    );
  }
  const rawArray = Object.values(jsonObj)[0];
  const array = rawArray.filter((string) => string && string.length > 0);
  return array;
};

const setEmbeddingObj = async ({ strings, currentEmbeddings }) => {
  if (currentEmbeddings !== undefined) return currentEmbeddings;
  if (!strings) return null;
  if (strings.length == 0) return {};

  const embeddings = {};

  for (const string of strings) {
    embeddings[string] = await getEmbedding({ text: string });
  }

  return embeddings;
};

generateAndStoreEmbeddings();
