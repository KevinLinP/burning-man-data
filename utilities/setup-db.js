import { db } from "../lib/sql-db.js";

const createTable = async () => {
  const result = await db.schema.createTable("camps", function (table) {
    table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));

    table.string("name");
    table.timestamp("indexed_at");
  });

  console.log(result);
};

const createEmbeddingsTable = async () => {
  const result = await db.schema.createTable("embeddings", function (table) {
    table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));

    table
      .enu("objectType", null, {
        useNative: true,
        existingType: true,
        enumName: "objectType",
      })
      .notNullable();
    table.string("objectId").notNullable();
    table
      .enu("property", null, {
        useNative: true,
        existingType: true,
        enumName: "property",
      })
      .notNullable();
    table.text("text").notNullable();

    table.unique(["objectType", "objectId", "property", "text"]);

    table.specificType("vector", "double precision[]").notNullable();

    table.timestamp("indexedAt");
    table.index("indexedAt");
  });

  console.log(result);
};

const addColumn = async () => {
  const result = await db.schema.table("camps", function (table) {
    table.integer("campIndex").notNullable();
    table.index("campIndex");

    table.string("uid").notNullable();
    table.index("uid");
  });

  console.log(result);
};

const dropColumn = async () => {
  const result = await db.schema.table("camps", function (table) {
    table.dropColumn("campIndex");
    table.dropColumn("uid");
  });

  console.log(result);
};

const listRows = async () => {
  const result = await db.select("*").from("embeddings").limit(10);
  console.log(result);
};

const insertRow = async () => {
  const result = await db("camps").insert({
    uid: "test-uid",
    campIndex: 0,
  });
  console.log(result);
};

const deleteRow = async ({ id }) => {
  const result = await db("camps").where({ id }).del();
  console.log(result);
};

const addIndex = async () => {
  const result = await db.schema.alterTable("camps", function (table) {
    table.index("indexed_at");
  });

  console.log(result);
};

const renameColumn = async () => {
  const result = await db.schema.table("camps", function (table) {
    table.renameColumn("indexed_at", "indexedAt");
    table.index("indexedAt");
  });

  console.log(result);
};

const dropType = async () => {
  const result = await db.schema.raw("DROP TYPE objectType");
  console.log(result);
};

const run = async () => {
  try {
    // await createTable();
    // await addIndex();
    // await dropColumn();
    // await addColumn();
    // await insertRow();
    await listRows();
    // await deleteRow({ id: "de2a610b-f570-47ec-be7b-ea704f2a9e90" });
    // await listRows();
    // await renameColumn();
    // await createEmbeddingsTable();
    // await dropType();
  } finally {
    db.destroy();
  }
};

run();
