import knex from "knex";

const db = knex({
  client: "cockroachdb",
  connection: process.env.DATABASE_URL,
});

const createTable = async () => {
  const result = await db.schema.createTable("camps", function (table) {
    table.uuid("id").primary().defaultTo(db.raw("gen_random_uuid()"));

    table.string("name");
    table.timestamp("indexed_at");
  });

  console.log(result);
};

const listRows = async () => {
  const result = await db.select("*").from("camps").limit(10);
  console.log(result);
};

const insertRow = async () => {
  const result = await db("camps").insert({
    name: "Test Camp",
  });
  console.log(result);
};

const deleteRow = async ({ id }) => {
  const result = await db("camps").where({ id }).del();
  console.log(result);
};

// await createTable();
await listRows();
// await insertRow();
// await deleteRow({ id: "c387d94e-0f11-4503-99ea-5fcada0f615c" });

process.exit();
