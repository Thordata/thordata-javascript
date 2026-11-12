"use strict";

const { Client } = require("../src");

async function main() {
  const client = new Client();
  const records = await client.scrape(
    "linkedin_company_information_by-url",
    { url: "https://www.linkedin.com/company/microsoft" },
  );
  console.log(records);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
