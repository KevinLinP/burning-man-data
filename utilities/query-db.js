import { db } from "#lib/sql-db.js";

const count = async () => {
  const result = await db("embeddings").count("*");
  console.log(result);
};

const randomRows = async (limit) => {
  const result = await db("embeddings")
    .select("*")
    .orderByRaw("RANDOM()")
    .limit(limit);
  console.log(result);
};

const run = async () => {
  try {
    // await count();
    await randomRows(10);
  } finally {
    db.destroy();
  }
};

run();
