#!/usr/bin/env node

/**
 * Woopicx MCP Server
 * Spec-compliant Model Context Protocol server over stdio (JSON-RPC 2.0).
 * No dependencies — pure Node stdlib. Node 18+ (uses global fetch).
 *
 * Exposes tool: search_woopicx — search free graphics via /v1/search.
 *
 * Run: node woopicx-mcp.js
 * Config (Cursor / Claude Desktop): see MCP_README.md
 */

import { createInterface } from "node:readline";

const API_BASE = process.env.WOOPICX_API_BASE || "https://api.woopicx.com";
const API_KEY = process.env.WOOPICX_API_KEY;
if (!API_KEY) {
  console.error("WOOPICX_API_KEY is not set. Get a free key at https://woopicx.com/api");
  process.exit(1);
}
const PROTOCOL_VERSION = "2024-11-05";

const TOOLS = [
  {
    name: "search_woopicx",
    description:
      "Search free graphics on Woopicx: 3D icons, mockups, stock photos, illustrations, certificates, tattoo designs. Returns asset titles and woopicx.com URLs.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            'Search query, e.g. "business icons", "phone mockup", "tattoo designs".',
        },
        collection: {
          type: "string",
          enum: [
            "basic3d",
            "base",
            "mobile-phone-mockup",
            "saas-mockups",
            "certificates",
            "tattoo",
          ],
          description: "Optional collection to narrow the search.",
        },
        limit: {
          type: "integer",
          description: "Number of results, 1-50 (default 15).",
          default: 15,
        },
      },
      required: ["query"],
    },
  },
];

async function searchAssets({ query, collection = null, limit = 15 }) {
  const body = {
    query,
    collection,
    limit: Math.max(1, Math.min(Number(limit) || 15, 50)),
    is_free: true,
  };
  const res = await fetch(`${API_BASE}/v1/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return { error: `API error ${res.status}: ${(await res.text()).slice(0, 200)}` };
  }
  const data = await res.json();
  const results = (data.results || []).slice(0, body.limit).map((r) => ({
    uid: r.uid,
    title: r.title,
    collection: (r.collection && r.collection[0]) || null,
    type: r.media_type,
    url: `https://woopicx.com/asset/${r.uid}`,
    thumb: Array.isArray(r.thumb_url) ? r.thumb_url[0] : r.thumb_url || null,
  }));
  return { total: data.total_found ?? results.length, count: results.length, results };
}

// ---- JSON-RPC plumbing over stdio ----

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}
function result(id, res) {
  send({ jsonrpc: "2.0", id, result: res });
}
function error(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handle(msg) {
  const { id, method, params } = msg;

  // notifications (no id) — ack silently
  if (id === undefined || id === null) {
    return; // e.g. notifications/initialized
  }

  switch (method) {
    case "initialize":
      return result(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "woopicx", version: "1.0.0" },
      });

    case "ping":
      return result(id, {});

    case "tools/list":
      return result(id, { tools: TOOLS });

    case "tools/call": {
      const name = params?.name;
      const args = params?.arguments || {};
      if (name !== "search_woopicx") {
        return error(id, -32602, `Unknown tool: ${name}`);
      }
      try {
        const data = await searchAssets(args);
        return result(id, {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          isError: Boolean(data.error),
        });
      } catch (e) {
        return result(id, {
          content: [{ type: "text", text: `Error: ${e.message}` }],
          isError: true,
        });
      }
    }

    default:
      return error(id, -32601, `Method not found: ${method}`);
  }
}

function main() {
  console.error("[woopicx-mcp] listening on stdio");
  const rl = createInterface({ input: process.stdin });
  rl.on("line", (line) => {
    const t = line.trim();
    if (!t) return;
    let msg;
    try {
      msg = JSON.parse(t);
    } catch {
      return console.error("[woopicx-mcp] bad JSON:", t.slice(0, 120));
    }
    handle(msg).catch((e) => console.error("[woopicx-mcp] handler error:", e.message));
  });
  rl.on("close", () => process.exit(0));
}

main();
