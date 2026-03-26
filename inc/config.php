<?php
/**
 * Centralized configuration for the Snel SEO plugin.
 * Single source of truth for option names, meta keys, defaults, AI settings, etc.
 *
 * @package SnelSEO
 */

defined( 'ABSPATH' ) || exit;

class SnelSeoConfig {

    // ── WP Option Names ──────────────────────────────────────────────
    public static $option_titles   = 'wpseo_titles';          // Legacy name (Yoast compat)
    public static $option_cpt      = 'snel_seo_post_type_settings';
    public static $option_sitemap  = 'snel_seo_sitemap';
    public static $option_robots   = 'snel_seo_robots_txt';

    // ── REST API ─────────────────────────────────────────────────────
    public static $rest_namespace = 'snel-seo/v1';

    // ── Post Meta Keys ───────────────────────────────────────────────
    public static $meta_title     = '_snel_seo_title';
    public static $meta_desc      = '_snel_seo_metadesc';
    public static $meta_keyphrase = '_snel_seo_focus_kw';

    // ── Database Table Suffixes ──────────────────────────────────────
    public static $table_redirects = 'snel_seo_redirects';
    public static $table_404_log   = 'snel_seo_404_log';

    // ── Character Limits ─────────────────────────────────────────────
    public static $max_title_length = 60;
    public static $max_desc_length  = 155;
    public static $max_desc_input   = 160;   // UI input limit (slightly more lenient)
    public static $excerpt_words    = 25;

    // ── AI Defaults ──────────────────────────────────────────────────
    public static $ai_model             = 'gpt-4o-mini';
    public static $ai_temp_translation  = 0.3;
    public static $ai_temp_analysis     = 0.3;
    public static $ai_temp_suggestion   = 0.5;
    public static $ai_temp_generation   = 0.7;
    public static $ai_api_url           = 'https://api.openai.com/v1/chat/completions';

    // ── Separator Map ────────────────────────────────────────────────
    public static $separators = array(
        'sc-dash'   => "\xe2\x80\x93",  // –
        'sc-hyphen' => '-',
        'sc-pipe'   => '|',
        'sc-middot' => "\xc2\xb7",      // ·
        'sc-bullet' => "\xe2\x80\xa2",  // •
        'sc-raquo'  => "\xc2\xbb",      // »
        'sc-slash'  => '/',
    );

    public static $default_separator = 'sc-dash';

    // ── Default Title/Meta Templates ─────────────────────────────────
    public static $default_templates = array(
        'title_home'    => '%%sitename%% %%separator%% %%sitedesc%%',
        'metadesc_home' => '',
        'title_post'    => '%%title%% %%separator%% %%sitename%%',
        'metadesc_post' => '',
        'title_page'    => '%%title%% %%separator%% %%sitename%%',
        'metadesc_page' => '',
    );

    // ── Template Variable Badges (for UI) ────────────────────────────
    public static $template_badges = array(
        'homepage' => array(
            array( 'label' => 'Site Name',  'value' => '%%sitename%%' ),
            array( 'label' => 'Tagline',    'value' => '%%sitedesc%%' ),
            array( 'label' => 'Separator',  'value' => '%%separator%%' ),
        ),
        'page' => array(
            array( 'label' => 'Page Title', 'value' => '%%title%%' ),
            array( 'label' => 'Site Name',  'value' => '%%sitename%%' ),
            array( 'label' => 'Separator',  'value' => '%%separator%%' ),
        ),
        'post' => array(
            array( 'label' => 'Post Title', 'value' => '%%title%%' ),
            array( 'label' => 'Site Name',  'value' => '%%sitename%%' ),
            array( 'label' => 'Separator',  'value' => '%%separator%%' ),
            array( 'label' => 'Category',   'value' => '%%category%%' ),
        ),
    );

    // ── Language Names (for AI prompts) ──────────────────────────────
    public static $lang_names = array(
        'nl' => 'Dutch',      'en' => 'English',    'de' => 'German',
        'fr' => 'French',     'es' => 'Spanish',    'it' => 'Italian',
        'pt' => 'Portuguese', 'ja' => 'Japanese',   'zh' => 'Chinese',
        'ko' => 'Korean',     'ar' => 'Arabic',     'ru' => 'Russian',
        'pl' => 'Polish',     'tr' => 'Turkish',    'sv' => 'Swedish',
    );

    // ── Meta Key Skip Prefixes (for CPT field detection) ─────────────
    public static $meta_skip_prefixes = array(
        '_wp_', '_oembed_', '_encloseme', '_pingme', '_snel_seo_', '_thumbnail_id',
    );

    // ── Sitemap Defaults ─────────────────────────────────────────────
    public static $sitemap_defaults = array(
        'enabled'          => false,
        'include_pages'    => true,
        'include_posts'    => true,
        'include_products' => true,
        'excluded_ids'     => array(),
    );

    // ── Helpers ──────────────────────────────────────────────────────

    /**
     * Get the separator character for a given key.
     */
    public static function get_separator( $key = null ) {
        if ( ! $key ) {
            $settings = get_option( self::$option_titles, array() );
            $key      = isset( $settings['separator'] ) ? $settings['separator'] : self::$default_separator;
        }
        return isset( self::$separators[ $key ] ) ? self::$separators[ $key ] : self::$separators[ self::$default_separator ];
    }

    /**
     * Get a full table name with WP prefix.
     */
    public static function table( $suffix ) {
        global $wpdb;
        return $wpdb->prefix . $suffix;
    }

    /**
     * Get the language name for AI prompts.
     */
    public static function lang_name( $code ) {
        return isset( self::$lang_names[ $code ] ) ? self::$lang_names[ $code ] : $code;
    }

    /**
     * Get the AI model (from Snelstack settings or default).
     */
    public static function ai_model() {
        return function_exists( 'snelstack_get_openai_model' ) ? snelstack_get_openai_model() : self::$ai_model;
    }

    /**
     * Get the OpenAI API key.
     */
    public static function ai_key() {
        return function_exists( 'snelstack_get_openai_key' ) ? snelstack_get_openai_key() : '';
    }

    /**
     * Export config values for the JS frontend.
     */
    public static function to_js() {
        return array(
            'separators'       => array_map( function( $key, $char ) {
                return array( 'label' => $char, 'value' => $key );
            }, array_keys( self::$separators ), self::$separators ),
            'defaultSeparator' => self::$default_separator,
            'defaultTemplates' => self::$default_templates,
            'templateBadges'   => self::$template_badges,
            'maxTitleLength'   => self::$max_title_length,
            'maxDescLength'    => self::$max_desc_input,
        );
    }
}
