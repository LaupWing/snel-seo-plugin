# Snel SEO Plugin

Lightweight SEO toolkit by Snelstack. AI-powered, multilingual, zero bloat.

## Commands

```bash
npm run build          # Production build (outputs to build/)
npm run start          # Watch mode for development
npm install --include=dev  # Install deps (Local by Flywheel sets NODE_ENV=production)
```

## Architecture

```
snel-seo.php              # Entry point — defines constants, loads modules
inc/
  admin.php               # Admin menu, script enqueue, settings REST endpoints, CPT meta detection
  head-output.php         # Frontend <head>: title, meta desc, OG, canonical, JSON-LD
  meta-box.php            # Gutenberg + classic metabox registration (all public post types)
  classic-metabox/        # Classic editor SEO metabox (PHP-rendered, for non-Gutenberg CPTs)
  rest-api.php            # AI endpoints: analyze, suggest-keyphrases, generate, render
  redirects.php           # Redirect CRUD + 404 logging (custom DB tables)
  sitemap.php             # Custom XML sitemap generation + settings
  robots.php              # robots.txt editor
  languages.php           # Multilingual helpers (detects languages from theme filters)
src/
  index.js                # Admin app entry — routes to page components
  editor.js               # Gutenberg sidebar metabox mount
  pages/                  # Admin pages: Dashboard, Settings, Redirects, Sitemap, Tools
  components/             # Shared: GooglePreview, SeoMetaBox, KeyphraseChecks, Tabs, etc.
  styles/main.css         # Tailwind CSS
```

## Data Structures

This is critical. The plugin works with themes that store meta in different formats.

### Post Meta (per-post SEO data)

Stored in `wp_postmeta`. Keys:

| Key | Format | Description |
|-----|--------|-------------|
| `_snel_seo_title` | JSON string `{"nl":"...","en":"..."}` | Custom SEO title per language |
| `_snel_seo_metadesc` | JSON string `{"nl":"...","en":"..."}` | Custom meta description per language |
| `_snel_seo_focus_kw` | JSON string `{"nl":"...","en":"..."}` | Focus keyphrase per language |

These are always JSON-encoded strings with language codes as keys. Parse with `json_decode()` in PHP, `JSON.parse()` in JS.

### Theme Meta (varies per theme!)

The theme controls how product/CPT data is stored. There are **three patterns** the plugin must handle:

**1. Multilingual array** — single key, value is a PHP array with lang codes:
```php
// _product_short_description, _product_description
get_post_meta($id, '_product_short_description', true);
// Returns: ['nl' => 'Dutch text', 'en' => 'English text', 'de' => 'German text']
```

**2. Per-language keys** — separate meta key per language:
```php
// _title_nl, _title_en, _title_de, _title_fr, _title_es, _title_it
get_post_meta($id, '_title_nl', true);  // Returns: 'Dutch title'
get_post_meta($id, '_title_en', true);  // Returns: 'English title'
```
Note: default language title lives in `post_title` (WP core), NOT in meta.

**3. Plain value** — single key, single string:
```php
// _price, _article_number, _sold
get_post_meta($id, '_price', true);  // Returns: '€ 1.250'
```

### Resolving the right language

Use `snel_seo_resolve_meta_field($post_id, $field_key)` — it handles all three patterns:
- Multilingual arrays: extracts current lang, falls back to default
- Per-lang keys (`_title_{lang}`): swaps `{lang}` for current language code
- Plain values: returns as-is

### WP Options (plugin settings)

| Option name | What it stores |
|-------------|---------------|
| `wpseo_titles` | General settings: website_name, separator, default_og_image, title/meta templates for homepage/posts/pages (multilingual as JSON strings) |
| `snel_seo_post_type_settings` | Per-CPT config: title_template, metadesc_template, desc_fallback_keys, schema_type, schema_fields |
| `snel_seo_sitemap` | Sitemap settings: enabled, include_pages/posts, dynamic `include_{cpt}` per public CPT, excluded_ids |
| `snel_seo_robots_txt` | Custom robots.txt content |

### Custom Database Tables

| Table | Purpose |
|-------|---------|
| `wp_snel_seo_redirects` | source_url, target_url, type (301/302), is_pattern, hits, created_at |
| `wp_snel_seo_404_log` | url, hits, referrer, user_agent, first_seen, last_seen |

## Multilingual System

The plugin does NOT manage translations itself. It hooks into the theme's translation system via filters:
- `snel_seo_languages` — returns array of `['code' => 'nl', 'label' => 'NL', 'default' => true]`
- `snel_seo_current_language` — returns current lang code (e.g. 'de')
- `snel_seo_default_language` — returns default lang code (e.g. 'nl')

If no filters exist, the plugin works as single-language.

## Fallback Chain (description resolution)

When no custom SEO description is set for a post:

1. **CPT configured fallback fields** — from `snel_seo_post_type_settings` → `desc_fallback_keys` (ordered list)
2. **Excerpt** — if manually written
3. **Post content** — first 155 characters
4. **Title + site name** — last resort

## JSON-LD Structured Data

The plugin outputs JSON-LD schema in `<head>` on singular pages. Schema is **fully dynamic and theme-agnostic** — no hardcoded post types, meta keys, or taxonomies.

### How it works

1. **Organization** — always output on singular pages (site name + URL + logo)
2. **BreadcrumbList** — always output on singular pages. If the CPT has a `taxonomy` mapped in schema_fields, the term is added as a breadcrumb level.
3. **Per-CPT schema** — configured in **Settings > Post Types > [CPT] > Structured Data (JSON-LD)**

### Configuration (per CPT)

Stored in `snel_seo_post_type_settings[{cpt}]`:

| Key | What it stores |
|-----|---------------|
| `schema_type` | Schema.org type string: `Product`, `Article`, `LocalBusiness`, `Event`, `FAQPage`, or empty (none) |
| `schema_fields` | Object mapping schema properties to meta keys or static values |

### Schema types and their fields

Each schema type is defined in `src/schema-types/{type}.js`. Fields have an `input` type:

- `meta` — dropdown of detected meta keys from the database (reads value per post)
- `text` — static text value (same for all posts of this type)
- `select` — dropdown with predefined options
- `taxonomy` — dropdown of registered taxonomies for the CPT (used in breadcrumbs)

**Product**: price (meta), priceCurrency (text), availability (meta → truthy=OutOfStock, falsy=InStock), brand (text), sku (meta), taxonomy
**Article**: authorName (text, falls back to post author), publisherName (text, falls back to site name), taxonomy
**LocalBusiness**: streetAddress, addressLocality, postalCode, addressCountry, telephone, openingHours, priceRange (all text)
**Event**: startDate (meta), endDate (meta), locationName (text), locationAddress (text), price (meta), priceCurrency (text), taxonomy
**FAQPage**: no fields (uses page content)

### Adding a new schema type

1. Create `src/schema-types/{type}.js` with `type`, `label`, `description`, and `fields` array
2. Import and add to `src/schema-types/index.js`
3. Add the PHP output logic in `inc/head-output.php` (inside the `if ( $schema_type )` block)

### Theme-agnostic design

- No post type names are hardcoded — all come from `get_post_types()`
- No meta keys are hardcoded — all come from user configuration or dynamic detection
- No taxonomy names are hardcoded — all come from `get_object_taxonomies()`
- Sitemap dynamically discovers all public CPTs via `get_post_types()` and creates `include_{cpt}` toggles
- Default language uses `snel_seo_get_default_lang()` everywhere, never hardcoded 'nl'

## Rules

- Build outputs go in `build/` (gitignored). Never commit build files.
- All SEO meta is stored as JSON strings with language codes as keys.
- Never hardcode post type names or meta keys — use the dynamic config from `snel_seo_post_type_settings`.
- The option name `wpseo_titles` is legacy (from Yoast compatibility) — do not rename it.
- AI features use OpenAI via the Snelstack plugin's API key (`snelstack_get_openai_key()`).

## Versioning

When pushing changes, **always bump the version** before committing. Version must be updated in all three places:
- `package.json` → `"version"`
- `snel-seo.php` → `Version:` header comment
- `snel-seo.php` → `SNEL_SEO_VERSION` constant

Ask the user whether the change warrants a **patch** (bug fix, small tweak), **minor** (new feature), or **major** (breaking change) bump, and recommend one. CI auto-creates a GitHub release when version changes on push to main.

## Redirect Migration SOP

**Critical lesson:** Never build the redirect mapping before the WordPress site is fully seeded. Target URLs must come from the actual WordPress database, not from guesses or scraper-generated slugs.

### Correct order for site migrations:

1. **Scrape old site** — collect all old URLs, product data, categories
2. **Seed WordPress** — import everything (products, categories, pages, images)
3. **Build redirect mapping** — query WordPress DB for real permalinks, match via article number / identifier, generate `snel-seo-import.json`
4. **Import into Snel SEO** — use the JSON import (wildcards auto-detected from `*`)
5. **Test with redirect tester** — drop the test JSON file, verify coverage
6. **Cross-reference with Google Search Console** — ensure all URLs with impressions/clicks are covered

### Redirect types:
- **Products** (`/producten/show/{id}`) → exact match to `/product/{wp-slug}/` (query `_article_number` meta)
- **Pagination** (`/Category/pagina/*`) → wildcard pattern to parent category
- **Categories** → exact match to new flat category URL
- **Deleted/missing content** → fallback to `/producten/`
- **Image URLs** (`/uploads/...`) → ignore, Google drops these naturally

### Matching:
- All matching is **case-insensitive** (both exact and wildcard)
- Wildcard patterns match any URL starting with the prefix before `*`
- Exact matches are checked first, then patterns
