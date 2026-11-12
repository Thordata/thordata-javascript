"use strict";

const { Client } = require("../src");

async function main() {
  const client = new Client();
  const result = await client.search({
    engine: "google_search",
    q: "latest AI agent research",
    gl: "us",
    hl: "en",
    num: 5,
  });
  console.log(result);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
