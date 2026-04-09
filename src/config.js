/**
 * Centralized frontend configuration for Snel SEO.
 * Values are loaded from PHP via window.snelSeo.config where possible.
 * Fallbacks are defined here for when the PHP config isn't available.
 */

const phpConfig = window.snelSeo?.config || {};

// ── Separators ───────────────────────────────────────────────────────
export const SEPARATORS = phpConfig.separators || [
    { label: '\u2013', value: 'sc-dash' },   // –
    { label: '-', value: 'sc-hyphen' },
    { label: '|', value: 'sc-pipe' },
    { label: '\u00B7', value: 'sc-middot' }, // ·
    { label: '\u2022', value: 'sc-bullet' }, // •
    { label: '\u00BB', value: 'sc-raquo' },  // »
    { label: '/', value: 'sc-slash' },
];

export const DEFAULT_SEPARATOR = phpConfig.defaultSeparator || 'sc-dash';

// ── Separator lookup (key → character) ───────────────────────────────
export const SEPARATOR_MAP = {};
SEPARATORS.forEach( ( s ) => { SEPARATOR_MAP[ s.value ] = s.label; } );

export function getSeparatorChar( value ) {
    return SEPARATOR_MAP[ value ] || '\u2013';
}

// ── Default Templates ────────────────────────────────────────────────
export const DEFAULT_TEMPLATES = phpConfig.defaultTemplates || {
    title_home: '%%sitename%% %%separator%% %%sitedesc%%',
    metadesc_home: '',
    title_post: '%%title%% %%separator%% %%sitename%%',
    metadesc_post: '',
    title_page: '%%title%% %%separator%% %%sitename%%',
    metadesc_page: '',
};

// ── Template Variable Badges ─────────────────────────────────────────
export const TEMPLATE_BADGES = phpConfig.templateBadges || {
    homepage: [
        { label: 'Site Name', value: '%%sitename%%', tip: 'Your website name as set in General settings' },
        { label: 'Tagline', value: '%%sitedesc%%', tip: 'Your site tagline from Settings > General' },
        { label: 'Separator', value: '%%separator%%', tip: 'The character between title parts (e.g. \u2013 | /)' },
    ],
    page: [
        { label: 'Page Title', value: '%%title%%', tip: 'The title of the current page' },
        { label: 'Site Name', value: '%%sitename%%', tip: 'Your website name as set in General settings' },
        { label: 'Separator', value: '%%separator%%', tip: 'The character between title parts (e.g. \u2013 | /)' },
    ],
    post: [
        { label: 'Post Title', value: '%%title%%', tip: 'The title of the current post' },
        { label: 'Site Name', value: '%%sitename%%', tip: 'Your website name as set in General settings' },
        { label: 'Separator', value: '%%separator%%', tip: 'The character between title parts (e.g. \u2013 | /)' },
        { label: 'Category', value: '%%category%%', tip: 'The primary category of the post' },
    ],
    taxonomy: [
        { label: 'Term Title', value: '%%term_title%%', tip: 'The name of the current category or term' },
        { label: 'Term Description', value: '%%term_description%%', tip: 'The description of the current category or term' },
        { label: 'Site Name', value: '%%sitename%%', tip: 'Your website name as set in General settings' },
        { label: 'Separator', value: '%%separator%%', tip: 'The character between title parts (e.g. \u2013 | /)' },
    ],
};

// ── Character Limits ─────────────────────────────────────────────────
export const MAX_TITLE_LENGTH = phpConfig.maxTitleLength || 60;
export const MAX_DESC_LENGTH = phpConfig.maxDescLength || 160;

// ── Multilingual Keys (settings that support per-language values) ────
export const MULTILINGUAL_KEYS = [
    'site_tagline',
    'title_home', 'metadesc_home',
    'title_page', 'metadesc_page',
    'title_post', 'metadesc_post',
];
