# Woopicx MCP (Model Context Protocol) Server

Expose Woopicx `/v1/search` API as a tool for Claude, Cursor, and other LLM clients via MCP.

## What is MCP?

MCP is a protocol that lets LLMs call external tools over stdio. When you enable a tool in Claude or Cursor, you can type "search Woopicx for business icons" and the LLM will automatically call our API and return results.

## Quick Setup (Cursor / Claude Desktop)

### 1. Install Node.js (if not already)

```bash
node --version  # should be 18+
```

### 2. Get your Woopicx API Key

Public test key: `wpx_live_2cc034849a7fa88889044181170ee259`

Or generate your own at: https://woopicx.com/admin/api-keys

### 3. Add to Cursor settings.json

Open Cursor → Settings → Features → "Code Editor" → scroll to "MCP Servers" → click "Edit JSON"

Add:
```json
{
  "mcpServers": {
    "woopicx": {
      "command": "node",
      "args": ["/absolute/path/to/woopicx-mcp/index.js"],
      "env": {
        "WOOPICX_API_KEY": "wpx_live_2cc034849a7fa88889044181170ee259"
      }
    }
  }
}
```

> Once published to npm you can instead use `"command": "npx", "args": ["-y", "woopicx-mcp"]`.

### 4. Restart Cursor

Now you can ask: **"Find me some free 3D business icons from Woopicx"**

Cursor will automatically call `search_woopicx` tool with your query.

## Claude Desktop (macOS)

1. Edit `~/.claude/claude.json`:

```json
{
  "mcpServers": {
    "woopicx": {
      "command": "node",
      "args": ["/path/to/woopicx-mcp.js"],
      "env": {
        "WOOPICX_API_KEY": "wpx_live_2cc034849a7fa88889044181170ee259"
      }
    }
  }
}
```

2. Restart Claude Desktop

## API & Tool Details

### Tool: `search_woopicx`

**Description:** Search free graphics on Woopicx (3D icons, mockups, stock photos, illustrations, certificates, tattoo designs).

**Parameters:**
- `query` (string, required): Search term, e.g. "business icons", "mockups", "tattoo designs"
- `collection` (string, optional): Specific collection
  - `basic3d` - 3D icons (8k+ free)
  - `base` - stock photos & illustrations
  - `mobile-phone-mockup` - phone mockups
  - `saas-mockups` - SaaS/startup mockups
  - `certificates` - certificate templates
  - `tattoo` - tattoo designs
- `limit` (integer, optional): Results count, 1-50 (default 15)

**Response:**
```json
{
  "results": [
    {
      "uid": "550bf722-...",
      "title": "Business Person Icon",
      "collection": "basic3d",
      "type": "png",
      "url": "https://woopicx.com/asset/550bf722-...",
      "thumb": "https://cdn.woopicx.com/..."
    }
  ],
  "total": 127,
  "duration_ms": 34
}
```

## How It Works

1. LLM sees your prompt ("find business icons")
2. LLM decides to use `search_woopicx` tool
3. LLM sends request to MCP server via stdio
4. Server calls `/v1/search` API on Woopicx
5. Server returns results to LLM
6. LLM formats results for you

## Troubleshooting

**"Tool not found"**
- Restart your IDE
- Check the file path is absolute (not relative)

**"API Error 401"**
- Check your API key is set correctly
- Verify key has `/v1/search` permission

**"No results found"**
- Try a simpler query ("icons" instead of "custom business svg logos")
- Specify a collection to narrow search

## Publishing to MCP Hub

Once tested, publish to mcp.so:
1. Create GitHub repo: `woopicx-mcp`
2. Push this server + README
3. Submit to https://mcp.so/registry

## Future Ideas

- [ ] Image similarity search (upload PNG, find similar)
- [ ] Collection browser (list all available collections)
- [ ] Download tool (get asset ZIP with Claude's permission)
- [ ] Batch search (search multiple collections in one call)

---

**Woopicx:** 40+ free collections of graphics. No signup to browse.  
**API Docs:** https://api.woopicx.com/docs

Made for Claude, Cursor, and beyond.
