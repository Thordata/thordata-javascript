"use strict";

const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const sdk = require("../src");

const originalFetch = globalThis.fetch;

test("basic SERP fixture matches the normalized form", () => {
  const fixture = JSON.parse(fs.readFileSync(
    path.join(__dirname, "..", "..", "contract-fixtures", "serp", "basic-request.json"),
    "utf8",
  ));
  assert.equal(fixture.form.engine, "google");
  assert.equal(Object.hasOwn(fixture.form, "integration_platform"), false);
  assert.equal(Object.hasOwn(fixture.form, "integration_source"), false);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function response(body, { status = 200, ok = status >= 200 && status < 300 } = {}) {
  return {
    ok,
    status,
    text: async () => JSON.stringify(body),
  };
}

test("search normalizes aliases and returns response metadata", async () => {
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options, form: Object.fromEntries(new URLSearchParams(options.body)) };
    return response({
      code: 200,
      data: {
        result: { search_information: { query_displayed: "pizza" } },
        task_id: "task-serp-1",
      },
    });
  };

  const client = new sdk.Client({ apiKey: "test-key" });
  const result = await client.searchResponse({
    engine: "google_search",
    query: "pizza",
    country: "us",
    language: "en",
  });

  assert.equal(captured.url, "https://scraperapi.thordata.com/request");
  assert.equal(captured.options.method, "POST");
  assert.equal(captured.options.headers.Authorization, "Bearer test-key");
  assert.equal(captured.options.headers.Origin, "JavaScript");
  assert.equal(captured.options.headers.platform, "javascript");
  assert.equal(captured.options.headers["api-source"], "sdk");
  assert.deepEqual(captured.form, {
    engine: "google",
    q: "pizza",
    gl: "us",
    hl: "en",
    json: "1",
    isjson: "1",
  });
  assert.equal(result.result.search_information.query_displayed, "pizza");
  assert.equal(result.taskId, "task-serp-1");
});

test("search converts Yandex q, booleans, and filters unknown fields", async () => {
  let form;
  globalThis.fetch = async (_url, options) => {
    form = Object.fromEntries(new URLSearchParams(options.body));
    return response({ code: 200, data: { result: [] } });
  };

  const result = await new sdk.Client({ apiKey: "test-key" }).search({
    engine: "yandex",
    q: "weather",
    safe: false,
    unknown: "drop",
  });

  assert.deepEqual(result, []);
  assert.deepEqual(form, {
    engine: "yandex",
    text: "weather",
    safe: "0",
    json: "1",
    isjson: "1",
  });
});

test("rawSearch normalizes the google_search engine alias", async () => {
  let form;
  globalThis.fetch = async (_url, options) => {
    form = Object.fromEntries(new URLSearchParams(options.body));
    return response({ code: 200, data: { result: [] } });
  };

  await new sdk.Client({ apiKey: "test-key" }).rawSearch({
    engine: "google_search",
    q: "raw",
  });

  assert.equal(form.engine, "google");
  assert.equal(form.json, "1");
  assert.equal(form.isjson, "1");
});

test("search rejects non-object params", async () => {
  globalThis.fetch = async () => response({ code: 200, data: { result: [] } });

  await assert.rejects(
    () => new sdk.Client({ apiKey: "test-key" }).search(["q", "value"]),
    (error) => error.name === "ThorDataInvalidRequestError" && error.code === 400,
  );
});

test("search rejects Web Scraper engines with the dedicated message", async () => {
  await assert.rejects(
    () => new sdk.Client({ apiKey: "test-key" }).search({ engine: "google_webpage", q: "page" }),
    (error) => error.name === "ThorDataInvalidRequestError"
      && /Web Scraper engines/.test(error.message),
  );
});

test("search distinguishes caller cancellation from request timeout", async () => {
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.signal.aborted, true);
    throw new DOMException("The operation was aborted", "AbortError");
  };

  await assert.rejects(
    () => new sdk.Client({ apiKey: "test-key" }).search({ q: "cancel" }, { signal: controller.signal }),
    (error) => error.name === "ThorDataConnectionError" && /cancelled/i.test(error.message),
  );
});

test("search maps collection-failed business code zero to not-collected", async () => {
  globalThis.fetch = async () => response({ code: 0, data: "error, Collection failed" });

  await assert.rejects(
    () => new sdk.Client({ apiKey: "test-key" }).search({ q: "failed" }),
    (error) => error.name === "ThorDataNotCollectedError" && error.code === 0,
  );
});

test("bare SERP results use search metadata id as task id", async () => {
  globalThis.fetch = async () => response({
    code: 200,
    organic: [],
    search_metadata: { id: "request-1" },
  });

  const result = await new sdk.Client({ apiKey: "test-key" }).searchResponse({ q: "one" });

  assert.equal(result.taskId, "request-1");
  assert.equal(result.raw.search_metadata.id, "request-1");
});

test("search parses nested JSON-string data and rawSearch preserves text", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      return response({ code: 200, data: JSON.stringify({ result: { ok: true } }) });
    }
    return { ok: true, status: 200, text: async () => "raw-body" };
  };

  const client = new sdk.Client({ apiKey: "test-key" });
  assert.deepEqual(await client.search({ q: "one" }), { ok: true });
  assert.equal(await client.rawSearch({ q: "two" }), "raw-body");
});

test("search raises the typed not-collected error without leaking the key", async () => {
  globalThis.fetch = async () => response({ code: 300, data: "test-key was rejected" });

  await assert.rejects(
    () => new sdk.Client({ apiKey: "test-key" }).search({ q: "one" }),
    (error) => {
      assert.equal(error.code, 300);
      assert.equal(error.name, "ThorDataNotCollectedError");
      assert.equal(error.message.includes("test-key"), false);
      return true;
    },
  );
});

test("client accepts the legacy TALORDATA token environment variable", () => {
  const previousKey = process.env.THORDATA_API_KEY;
  const previousToken = process.env.THORDATA_API_TOKEN;
  const previousLegacy = process.env.TALORDATA_API_TOKEN;
  delete process.env.THORDATA_API_KEY;
  delete process.env.THORDATA_API_TOKEN;
  process.env.TALORDATA_API_TOKEN = "legacy-token";
  try {
    assert.equal(new sdk.Client().apiKey, "legacy-token");
  } finally {
    if (previousKey === undefined) delete process.env.THORDATA_API_KEY;
    else process.env.THORDATA_API_KEY = previousKey;
    if (previousToken === undefined) delete process.env.THORDATA_API_TOKEN;
    else process.env.THORDATA_API_TOKEN = previousToken;
    if (previousLegacy === undefined) delete process.env.TALORDATA_API_TOKEN;
    else process.env.TALORDATA_API_TOKEN = previousLegacy;
  }
});
