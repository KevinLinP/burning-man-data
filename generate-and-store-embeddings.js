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
      await upsertCampEmbeddings({ db, camp, campEmbedding });
    }
  }
};

const upsertCampEmbeddings = async ({ db, camp, campEmbedding }) => {
  const ref =
    campEmbedding?.ref || db.collection("campEmbeddings").doc(camp.uid);
  const currentCampEmbeddingData = campEmbedding?.data() || {
    indexedAt: null,
  };

  const descriptionPhrases = await getDescriptionPhrasesObj({
    camp,
    currentCampEmbeddingData,
  });

  await setDescriptionPhrasesEmbeddings(descriptionPhrases);

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
    descriptionPhrases,
  };

  if (_.isMatch(currentCampEmbeddingData, newCampEmbeddingData)) return;

  console.log(
    "ref.set",
    ref.id,
    camp.name,
    Object.keys(_.pickBy(newCampEmbeddingData, (v) => v !== null))
  );

  await ref.set(newCampEmbeddingData, { merge: true });
};

const setEmbedding = async ({ text, currentEmbedding }) => {
  if (currentEmbedding != undefined) return currentEmbedding;
  if (!text || text.length == 0) return null;

  return await getEmbedding({ text });
};

// if descriptionPhrases have not been calculated yet, ask GPT for them,
// and save the results as keys with null values (for the embeddings of those phrases)
const getDescriptionPhrasesObj = async ({ camp, currentCampEmbeddingData }) => {
  if (currentCampEmbeddingData.descriptionPhrases)
    // have to not mutate original
    return { ...currentCampEmbeddingData.descriptionPhrases };

  const description = camp.description;
  if (!description || description.length == 0) {
    return null;
  }

  const descriptionPhrasesArray = await getDescriptionPhrases({
    description: camp.description,
  });
  const entries = descriptionPhrasesArray.map((phrase) => [phrase, null]);
  const descriptionPhrases = Object.fromEntries(entries);
  console.log(
    "getDescriptionPhrasesObj",
    camp.uid,
    description,
    descriptionPhrasesArray
  );

  return descriptionPhrases;
};

const getDescriptionPhrases = async ({ description }) => {
  const openai = new OpenAI();

  // link for myself:
  // https://platform.openai.com/playground/p/pPtFn8gRFLoMdqtInqIayvkX?mode=chat&model=gpt-3.5-turbo
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are provided with the blurb of a camp at Burning Man.\n\nWithout using any outside knowledge, please give me a summary of the blurb as a comprehensive list of phrases and/or short simple sentences.\n\nPlease give me your output as a JSON array of strings.",
      },
      { role: "user", content: description },
    ],
    model: "gpt-3.5-turbo-0125",
    response_format: { type: "json_object" },
    top_p: 0.5,
  });

  const jsonString = completion.choices[0].message.content;
  const rawArray = Object.values(JSON.parse(jsonString));

  return rawArray.filter((string) => string && string.length > 0);
};

const setDescriptionPhrasesEmbeddings = async (descriptionPhrases) => {
  if (!descriptionPhrases) return;

  for (const [phrase, embedding] of Object.entries(descriptionPhrases)) {
    if (embedding) continue;
    descriptionPhrases[phrase] = await getEmbedding({ text: phrase });
  }
};

generateAndStoreEmbeddings();
