# Backend (PHP)

## File Responsibilities

| File | What it does |
|------|-------------|
| `admin.php` | Admin menu registration, React app enqueue, settings save/load REST endpoints, `snel_seo_get_custom_post_types_with_meta()` for field detection |
| `head-output.php` | All frontend `<head>` output: title filter, meta description, OG tags, canonical URL, JSON-LD (Organization, BreadcrumbList, dynamic per-CPT schema) |
| `meta-box.php` | Registers SEO metabox on all public post types. Auto-detects Gutenberg vs classic editor per post. |
| `classic-metabox/` | PHP-rendered metabox for non-Gutenberg post types. Has its own fallback title/description pre-fill logic. |
| `rest-api.php` | AI-powered endpoints: analyze keyphrase, suggest keyphrases, generate title/desc/keyphrase, render post content |
| `redirects.php` | Redirect manager + 404 logging. Custom DB tables, REST CRUD, template_redirect hook for frontend redirects |
| `sitemap.php` | Custom XML sitemap at `/sitemap.xml`. Configurable post types, exclusion list. |
| `robots.php` | robots.txt filter override + REST endpoint for editing |
| `languages.php` | Helpers: `snel_seo_get_languages()`, `snel_seo_get_current_lang()`, `snel_seo_get_default_lang()`, `snel_seo_is_multilingual()` |

## Key Helper Functions

- `snel_seo_resolve_meta_field($post_id, $field_key)` — resolves any meta field to a string for the current language. Handles multilingual arrays, per-lang keys (`_{lang}` pattern), and plain strings.
- `snel_seo_get_cpt_config($post_type)` — returns the saved config for a CPT from `snel_seo_post_type_settings`.
- `snel_seo_get_cpt_template($config, $key)` — gets a multilingual template value for the current language.
- `snel_seo_get_ml_setting($settings, $key)` — reads a multilingual setting from `wpseo_titles` (handles JSON string → current lang).
- `snel_seo_resolve_template($template, $vars)` — replaces `%%sitename%%`, `%%title%%`, `%%separator%%`, etc.
- `snel_seo_auto_description($post_id)` — generates a meta description using the fallback chain.

## REST Endpoints

All under namespace `snel-seo/v1`. Require `manage_options` for admin endpoints, public for frontend.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/settings` | POST | Save all settings (titles, templates, post type config) |
| `/settings/translate` | POST | AI-translate a settings template to another language |
| `/redirects` | GET/POST | List/create redirects |
| `/redirects/{id}` | PUT/DELETE | Update/delete a redirect |
| `/redirects/import` | POST | Bulk import redirects from JSON |
| `/404-log` | GET | List 404 entries |
| `/404-log/{id}` | DELETE | Delete a 404 entry |
| `/404-log/clear` | DELETE | Clear all 404 entries |
| `/analyze/{id}` | POST | AI keyphrase analysis for a post |
| `/suggest-keyphrases/{id}` | POST | AI keyphrase suggestions |
| `/generate/{id}` | POST | AI generate title/desc/keyphrase |
| `/render/{id}` | GET | Server-side content extraction for AI analysis |
| `/redirects/test` | POST | Bulk test URLs against redirect table |
| `/export-urls` | GET | Export all site URLs (pages, posts, CPTs, taxonomies) |
| `/sitemap/settings` | GET/POST | Sitemap config |
| `/sitemap/preview` | GET | Preview sitemap URLs |
| `/robots` | GET/POST | robots.txt content |

## Title Resolution Order (head-output.php)

1. Custom SEO title from `_snel_seo_title` meta (any post type)
2. Homepage template from `wpseo_titles['title-home-wpseo']`
3. Post template from `wpseo_titles['title-post']`
4. Page template from `wpseo_titles['title-page']`
5. CPT template from `snel_seo_post_type_settings[{type}]['title_template']`
6. Default WordPress title

## Adding New Features

- New admin pages: add to `admin.php` menu + create page component in `src/pages/`
- New REST endpoint: add to the relevant `rest_api_init` hook in the responsible file
- New head output: add to the `wp_head` action in `head-output.php`
- New post meta: register in `meta-box.php` init hook
