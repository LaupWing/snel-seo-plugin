# Frontend (React)

## Stack

- React via `@wordpress/element` (NOT standalone React)
- WordPress components: `@wordpress/components`, `@wordpress/i18n`, `@wordpress/plugins`
- Icons: `lucide-react`
- Styling: Tailwind CSS (utility classes inline, no separate CSS modules)
- Build: `@wordpress/scripts` (webpack under the hood)

## Entry Points

- `index.js` — Admin pages app. Reads `data-page` attribute from `#snel-seo-root` to route to the correct page component.
- `editor.js` — Gutenberg sidebar. Mounts `SeoMetaBox` component as a block editor plugin panel.

## Page Components (`src/pages/`)

Each page is a self-contained component that manages its own state and API calls.

| Page | Route (`data-page`) | Description |
|------|---------------------|-------------|
| `Dashboard.js` | `dashboard` | Overview, quick actions, version |
| `Settings.js` | `settings` | General settings, title/meta templates (multilingual), Post Types tab |
| `Redirects.js` | `redirects` | Redirect CRUD + 404 log tab |
| `Sitemap.js` | `sitemap` | Sitemap settings, preview, exclusion list |
| `Tools.js` | `tools` | robots.txt editor, Export All URLs |

## Shared Components (`src/components/`)

| Component | Used in | Purpose |
|-----------|---------|---------|
| `Tabs.js` | Settings, Redirects | Reusable tab bar with icons and badges |
| `TemplateInput.js` | Settings | Text input with variable badge buttons (`%%title%%` etc.) |
| `GooglePreview.js` | Settings, SeoMetaBox | SERP preview (title + URL + description) |
| `SeoMetaBox.js` | editor.js | Main Gutenberg sidebar: SEO/Social/AI tabs |
| `KeyphraseChecks.js` | SeoMetaBox | Quick checks + AI analysis for focus keyphrase |
| `KeyphraseChecksLegacy.js` | classic-metabox | Simplified checks for classic editor |
| `SocialPreview.js` | SeoMetaBox | Facebook/X/LinkedIn OG preview |

## Global Data

All backend data is available via `window.snelSeo` (localized by `admin.php`):

```javascript
window.snelSeo = {
    restUrl:      'https://site.com/wp-json/snel-seo/v1',
    nonce:        'wp_rest_nonce',
    version:      '1.2.1',
    settings:     { website_name, separator, default_og_image, title_*, metadesc_*, post_type_settings },
    multilingual: true,
    languages:    [{ code: 'nl', label: 'NL', default: true }, ...],
    defaultLang:  'nl',
    favicon:      'https://site.com/favicon.ico',
    siteUrl:      'https://site.com',
    siteName:     'Site Name',
    siteDesc:     'Site tagline',
    postTypes:    [{ name: 'product', label: 'Products', fields: [...], taxonomies: [...] }],
};
```

## Settings Flow

1. `admin.php` loads settings from `wpseo_titles` + `snel_seo_post_type_settings` → passes to JS via `wp_localize_script`
2. `Settings.js` reads from `window.snelSeo.settings` into React state
3. User edits → local state updates
4. Save button → POST to `/snel-seo/v1/settings` → backend stores in WP options

## Patterns

- API calls use `fetch()` with `window.snelSeo.restUrl` and `X-WP-Nonce` header
- Multilingual inputs: settings state stores objects `{ nl: '...', en: '...' }`, the `activeLang` state controls which language is shown
- All text uses `__()` from `@wordpress/i18n` for translation readiness
- No Redux or external state management — each page manages its own `useState`

## Schema Types (`src/schema-types/`)

Each file defines a schema type with its field mappings for the Post Types settings UI:

| File | Schema.org type | Key fields |
|------|----------------|------------|
| `product.js` | Product | price, currency, availability, brand, sku, taxonomy |
| `article.js` | Article | author, publisher, taxonomy |
| `local-business.js` | LocalBusiness | address, phone, hours, price range |
| `event.js` | Event | dates, venue, ticket price, taxonomy |
| `faq.js` | FAQPage | (no fields — uses content) |
| `index.js` | — | Exports all types as `SCHEMA_TYPES` array |

Adding a new schema type: create a new file, export `{ type, label, description, fields }`, import in `index.js`.
