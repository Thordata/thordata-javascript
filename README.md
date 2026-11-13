# Thordata JavaScript SDK

JavaScript/Node.js client for the Thordata SERP API and seven verified Web Scraper products. The package is independent of LangChain and requires Node.js 18 or newer.

> **Next-generation Thordata JavaScript SDK for new projects.**
> This repository is the future primary JavaScript/Node.js SDK and is being prepared for public npm release.

Turn live web data into reliable Node.js applications faster. Thordata JavaScript SDK gives developers one interface for real-time search and structured web scraping, making it easier to build research tools, monitoring services, data pipelines, RAG systems, and AI agents.

Use it to track search visibility, enrich business and product data, monitor markets, or bring fresh web data into JavaScript and TypeScript applications without maintaining a separate scraper for every target.

## Why Thordata JavaScript SDK

- **Search and scrape through one client**: Query live search engines and collect structured records through ready-to-use Web Scraper actions.
- **Built for Node.js workflows**: Add web intelligence to backend services, scheduled jobs, automation, and AI applications with a familiar JavaScript interface.
- **Simple async integration**: Use promises and standard Node.js patterns for search and structured data collection.
- **Ready for downstream systems**: Pass structured results into analytics, enrichment, RAG, agents, and internal applications.
- **Designed for dependable use**: Benefit from predictable response handling, bounded task polling, and redacted diagnostics in production workflows.

Create a Thordata account to get started:

- [Get started with Thordata](https://www.thordata.com/?ls=github&lk=thordata)
- [Read the official documentation](https://doc.thordata.com)

## Install

```bash
npm install thordata
```

Set `THORDATA_API_KEY`, `THORDATA_API_TOKEN`, or the compatible `TALORDATA_API_TOKEN` environment variable. `apiKey`, `apiToken`, or `token` constructor options take precedence.

## SERP

```js
const { Client } = require("thordata");

async function main() {
  const client = new Client();
  const result = await client.search({
    engine: "google_search",
    q: "latest AI agent research",
    gl: "us",
    hl: "en",
  });
  console.log(result);
}

main().catch(console.error);
```

Requests are form-encoded `POST` calls to `https://scraperapi.thordata.com/request` with Bearer authentication. SERP source headers are `Origin: JavaScript`, `platform: javascript`, and `api-source: sdk`. The client supports the verified Thordata engines and API-native parameters. `google_search` maps to `google`, `google_places` maps to `google_local`, and `query`, `country`, and `language` map to `q`, `gl`, and `hl`. Yandex sends `q` as `text`. Boolean values become `1` or `0`, and unknown fields are ignored.

Use `searchResponse()` for task metadata and the raw response envelope, and `rawSearch()` for the unparsed response body. `taskId` comes from the upstream envelope when present and falls back to `search_metadata.id` for bare SERP results. The raw response keeps the engine-specific shape; Google commonly returns `organic`/`images`/`places`, while other engines may return `organic_results` or similar fields. `rawSearch()` returns text without interpreting business error codes. The SDK does not expose `searchHtml()` because the current `/request` endpoint does not guarantee HTML.

## Web Scraper

The initial SDK supports these spider IDs:

- `linkedin_company_information_by-url`: `url`
- `linkedin_job_listings_information_by-job-url`: `job_url`
- `youtube_video-post_by-keyword`: `keyword`, optional `num_of_posts`
- `facebook_profile_by-profiles-url`: `url`
- `youtube_video-post_by-explore`: `url`, optional `all_tabs`
- `twitter_profile_by-profileurl`: `url`
- `amazon_product_by-category-url`: `url`, `page_turning`, optional `sort_by`

```js
const { Client } = require("thordata");

const client = new Client();
const records = await client.scrape(
  "linkedin_company_information_by-url",
  { url: "https://www.linkedin.com/company/microsoft" },
);
console.log(records);
```

`scrape()` submits one task, polls every five seconds, and downloads final JSON records. Web Scraper source fields are form parameters `api_source=sdk` and `source_platform=javascript`; they are not request headers. Amazon uses `Best Sellers` when `sort_by` is omitted. The total wait is capped at 300 seconds by default. Use `scrapeResponse()` for `taskId`, `spiderId`, `status`, `recordCount`, and `errorRecordCount`. Status is `completed`, `partial`, or `empty`. Pass an `AbortSignal` to cancel local waiting.

For API errors, `code` is the Thordata business code and `statusCode` is the HTTP status. Business errors can therefore have `statusCode: 200`.

Web Scraper errors retain their stage and task ID when safe, while API keys and signed URLs are redacted from error text and diagnostic data.

## Local checks

```bash
npm test
npm run check
```

Tests use a mocked `fetch` and do not consume Thordata credits. See `examples/` for runnable SERP and Web Scraper examples.

## Start Building

Start with a SERP query for live web intelligence, add a Web Scraper action when you need structured records, and connect the results to the systems your team already uses. The same SDK can support a quick prototype today and a repeatable Node.js data pipeline tomorrow.

[Explore Thordata SERP API](https://www.thordata.com/products/serp-api?op=flora&from=github) | [Explore Thordata Web Scraper](https://www.thordata.com/products/web-scraper?op=flora&from=github)
