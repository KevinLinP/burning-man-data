import knex from "knex";

export const db = knex({
  client: "cockroachdb",
  connection: process.env.DATABASE_URL,
});
