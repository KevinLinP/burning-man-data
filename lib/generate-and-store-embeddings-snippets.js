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

const setDescriptionPhrasesEmbeddings = async (descriptionPhrases) => {
  if (!descriptionPhrases) return;

  for (const [phrase, embedding] of Object.entries(descriptionPhrases)) {
    if (embedding) continue;
    descriptionPhrases[phrase] = await getEmbedding({ text: phrase });
  }
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
