# SEO Scanner — Design Doc

## Overview
Bulk scan all pages across all languages. Renders each URL, extracts SEO elements, sends to AI for analysis. Results stored in DB, shown on Dashboard.

## Core Checks (v1)
1. **Title** — exists, correct language
2. **Meta description** — exists, correct language
3. **H1** — exists, only one, correct language
4. **Content language** — matches URL language
5. **Description relevance** — actually describes the product/page content

## Architecture

### Flow
1. User clicks "Scan All" on Dashboard
2. AJAX batches: 50 pages per request
3. Per page × per language:
   - `wp_remote_get(url)` to fetch rendered HTML
   - Extract: title, meta desc, h1, h2s, body text (DOM parsing, ~5 lines)
   - Send extracted data to AI with structured JSON schema
   - AI returns status per check + score + summary
4. Store result in `wp_snel_seo_scans` table
5. Dashboard shows summary + filterable list

### DB Table: `wp_snel_seo_scans`
- `id` (bigint, auto)
- `post_id` (bigint)
- `lang` (varchar 5)
- `url` (text)
- `checks` (JSON) — AI response per check
- `score` (int) — overall 0-100
- `ai_summary` (text, nullable)
- `scanned_at` (datetime)

### JSON Schema for AI Response
```json
{
  "checks": {
    "title": { "status": "ok|warning|error", "message": "..." },
    "meta_desc": { "status": "ok|warning|error", "message": "..." },
    "h1": { "status": "ok|warning|error", "message": "..." },
    "content_lang": { "status": "ok|warning|error", "message": "..." },
    "desc_relevance": { "status": "ok|warning|error", "message": "..." }
  },
  "score": 85,
  "summary": "One-line overall assessment"
}
```

### AI Prompt Structure
- System: "You are an SEO analyst. Analyze this page and return structured JSON."
- User: page URL, expected language, extracted title/desc/h1/content
- Response format: forced JSON schema via `response_format`

### Batch Process
- 50 pages per AJAX call
- Progress bar on dashboard
- ~1,766 pages × 6 languages = ~10,596 scans
- Estimated cost: $1-2 (GPT-4o-mini)
- Estimated time: 5-10 minutes full scan

## Future Checks (v2+)
- Image alt text presence
- Hreflang tag validation
- H2 structure
- Word count
- Internal link count
- Canonical URL correctness
