<?php
/**
 * Plugin Name: Snel SEO
 * Description: Lightweight SEO toolkit by Snelstack. Yoast-compatible, zero bloat.
 * Version: 1.0.0
 * Author: Snelstack
 * Author URI: https://snelstack.com
 * License: GPL v2 or later
 * Text Domain: snel-seo
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'SNEL_SEO_VERSION', '1.0.0' );
define( 'SNEL_SEO_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'SNEL_SEO_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// ─── Language Integration (Lego block) ───────────────────────────────────────

/**
 * Get available languages. Themes/plugins hook into 'snel_seo_languages' to provide their list.
 * Returns array of [ 'code' => 'nl', 'label' => 'NL', 'default' => true ].
 */
function snel_seo_get_languages() {
    return apply_filters( 'snel_seo_languages', array(
        array( 'code' => 'en', 'label' => 'EN', 'default' => true ),
    ) );
}

/**
 * Get the default language code.
 */
function snel_seo_get_default_lang() {
    $langs = snel_seo_get_languages();
    foreach ( $langs as $lang ) {
        if ( ! empty( $lang['default'] ) ) {
            return $lang['code'];
        }
    }
    return $langs[0]['code'] ?? 'en';
}

/**
 * Get the current language being viewed on the frontend.
 * Themes/plugins hook into 'snel_seo_current_language' to answer.
 */
function snel_seo_get_current_lang() {
    return apply_filters( 'snel_seo_current_language', snel_seo_get_default_lang() );
}

/**
 * Check if the site is multilingual (more than 1 language).
 */
function snel_seo_is_multilingual() {
    return count( snel_seo_get_languages() ) > 1;
}

/**
 * Register admin menu and submenu pages.
 */
add_action( 'admin_menu', function () {
    // Main menu — Dashboard
    add_menu_page(
        __( 'Snel SEO', 'snel-seo' ),
        __( 'Snel SEO', 'snel-seo' ),
        'manage_options',
        'snel-seo',
        function () { snel_seo_render_page( 'dashboard' ); },
        'dashicons-search',
        30
    );

    // Submenu: Dashboard (replaces auto-generated duplicate)
    add_submenu_page(
        'snel-seo',
        __( 'Dashboard', 'snel-seo' ),
        __( 'Dashboard', 'snel-seo' ),
        'manage_options',
        'snel-seo',
        function () { snel_seo_render_page( 'dashboard' ); }
    );

    // Submenu: Settings
    add_submenu_page(
        'snel-seo',
        __( 'Settings', 'snel-seo' ),
        __( 'Settings', 'snel-seo' ),
        'manage_options',
        'snel-seo-settings',
        function () { snel_seo_render_page( 'settings' ); }
    );

    // Submenu: Redirects
    add_submenu_page(
        'snel-seo',
        __( 'Redirects', 'snel-seo' ),
        __( 'Redirects', 'snel-seo' ),
        'manage_options',
        'snel-seo-redirects',
        function () { snel_seo_render_page( 'redirects' ); }
    );

    // Submenu: Tools
    add_submenu_page(
        'snel-seo',
        __( 'Tools', 'snel-seo' ),
        __( 'Tools', 'snel-seo' ),
        'manage_options',
        'snel-seo-tools',
        function () { snel_seo_render_page( 'tools' ); }
    );
} );

/**
 * Render the page container. React reads data-page to know which component to show.
 */
function snel_seo_render_page( $page ) {
    printf( '<div id="snel-seo-root" class="wrap" data-page="%s"></div>', esc_attr( $page ) );
}

/**
 * Enqueue the React app on Snel SEO admin pages only.
 */
add_action( 'admin_enqueue_scripts', function ( $hook ) {
    $seo_pages = array(
        'toplevel_page_snel-seo',
        'snel-seo_page_snel-seo-settings',
        'snel-seo_page_snel-seo-redirects',
        'snel-seo_page_snel-seo-tools',
    );

    if ( ! in_array( $hook, $seo_pages, true ) ) {
        return;
    }

    $asset_file = SNEL_SEO_PLUGIN_DIR . 'build/index.asset.php';

    if ( ! file_exists( $asset_file ) ) {
        return;
    }

    $asset = require $asset_file;

    wp_enqueue_script(
        'snel-seo-admin',
        SNEL_SEO_PLUGIN_URL . 'build/index.js',
        $asset['dependencies'],
        $asset['version'],
        true
    );

    wp_enqueue_style(
        'snel-seo-admin',
        SNEL_SEO_PLUGIN_URL . 'build/index.css',
        array( 'wp-components' ),
        $asset['version']
    );

    wp_enqueue_media();

    // Pass settings + REST info to JS.
    $settings = get_option( 'wpseo_titles', array() );

    wp_localize_script( 'snel-seo-admin', 'snelSeo', array(
        'restUrl'  => rest_url( 'snel-seo/v1' ),
        'nonce'    => wp_create_nonce( 'wp_rest' ),
        'version'  => SNEL_SEO_VERSION,
        'settings' => array(
            'website_name'  => isset( $settings['website_name'] ) ? $settings['website_name'] : get_bloginfo( 'name' ),
            'separator'     => isset( $settings['separator'] ) ? $settings['separator'] : 'sc-dash',
            'title_home'    => isset( $settings['title-home-wpseo'] ) ? $settings['title-home-wpseo'] : '%%sitename%% %%separator%% %%sitedesc%%',
            'metadesc_home' => isset( $settings['metadesc-home-wpseo'] ) ? $settings['metadesc-home-wpseo'] : '',
            'title_post'    => isset( $settings['title-post'] ) ? $settings['title-post'] : '%%title%% %%separator%% %%sitename%%',
            'metadesc_post' => isset( $settings['metadesc-post'] ) ? $settings['metadesc-post'] : '',
            'title_page'    => isset( $settings['title-page'] ) ? $settings['title-page'] : '%%title%% %%separator%% %%sitename%%',
            'metadesc_page'    => isset( $settings['metadesc-page'] ) ? $settings['metadesc-page'] : '',
            'default_og_image' => isset( $settings['default_og_image'] ) ? $settings['default_og_image'] : '',
        ),
        'favicon'  => get_site_icon_url( 28 ),
        'siteUrl'  => home_url(),
        'siteName' => get_bloginfo( 'name' ),
        'siteDesc' => get_bloginfo( 'description' ),
    ) );
} );

/**
 * Register REST API endpoints.
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'snel-seo/v1', '/settings', array(
        'methods'             => 'POST',
        'callback'            => 'snel_seo_save_settings',
        'permission_callback' => function () {
            return current_user_can( 'manage_options' );
        },
    ) );
} );

/**
 * Save SEO settings (Yoast-compatible option key).
 */
function snel_seo_save_settings( WP_REST_Request $request ) {
    $params   = $request->get_json_params();
    $settings = get_option( 'wpseo_titles', array() );

    $allowed_keys = array(
        'website_name'  => 'website_name',
        'separator'     => 'separator',
        'title_home'    => 'title-home-wpseo',
        'metadesc_home' => 'metadesc-home-wpseo',
        'title_post'    => 'title-post',
        'metadesc_post' => 'metadesc-post',
        'title_page'    => 'title-page',
        'metadesc_page'    => 'metadesc-page',
        'default_og_image' => 'default_og_image',
    );

    foreach ( $allowed_keys as $js_key => $wp_key ) {
        if ( isset( $params[ $js_key ] ) ) {
            $settings[ $wp_key ] = sanitize_text_field( $params[ $js_key ] );
        }
    }

    update_option( 'wpseo_titles', $settings );

    return rest_ensure_response( array( 'success' => true ) );
}

// ─── Frontend Head Output ────────────────────────────────────────────────────

/**
 * Get the separator character from the stored value.
 */
function snel_seo_get_separator() {
    $settings = get_option( 'wpseo_titles', array() );
    $sep_key  = isset( $settings['separator'] ) ? $settings['separator'] : 'sc-dash';
    $map      = array(
        'sc-dash'   => '–',
        'sc-hyphen' => '-',
        'sc-pipe'   => '|',
        'sc-middot' => '·',
        'sc-bullet' => '•',
        'sc-raquo'  => '»',
        'sc-slash'  => '/',
    );
    return isset( $map[ $sep_key ] ) ? $map[ $sep_key ] : '–';
}

/**
 * Resolve template variables in a title/description string.
 */
function snel_seo_resolve_template( $template, $vars = array() ) {
    foreach ( $vars as $key => $value ) {
        $template = str_replace( '%%' . $key . '%%', $value, $template );
    }
    return $template;
}

/**
 * Get template variables for the current page context.
 */
function snel_seo_get_vars() {
    $settings = get_option( 'wpseo_titles', array() );
    return array(
        'sitename'  => isset( $settings['website_name'] ) ? $settings['website_name'] : get_bloginfo( 'name' ),
        'sitedesc'  => get_bloginfo( 'description' ),
        'separator' => snel_seo_get_separator(),
        'title'     => wp_title( '', false ),
        'category'  => single_cat_title( '', false ) ?: '',
    );
}

/**
 * Filter the document title.
 */
add_filter( 'pre_get_document_title', function ( $title ) {
    $settings = get_option( 'wpseo_titles', array() );
    $vars     = snel_seo_get_vars();

    // Per-page override (multilingual).
    if ( is_singular() ) {
        $post_id  = get_queried_object_id();
        $raw      = get_post_meta( $post_id, '_snel_seo_title', true );
        $titles   = $raw ? json_decode( $raw, true ) : array();
        $lang     = snel_seo_get_current_lang();
        $default  = snel_seo_get_default_lang();
        $custom   = ! empty( $titles[ $lang ] ) ? $titles[ $lang ] : ( ! empty( $titles[ $default ] ) ? $titles[ $default ] : '' );
        if ( $custom ) {
            return snel_seo_resolve_template( $custom, $vars );
        }
    }

    // Homepage.
    if ( is_front_page() || is_home() ) {
        $template = isset( $settings['title-home-wpseo'] ) ? $settings['title-home-wpseo'] : '';
        if ( $template ) {
            return snel_seo_resolve_template( $template, $vars );
        }
    }

    // Single post.
    if ( is_singular( 'post' ) ) {
        $template = isset( $settings['title-post'] ) ? $settings['title-post'] : '';
        if ( $template ) {
            $vars['title'] = get_the_title();
            return snel_seo_resolve_template( $template, $vars );
        }
    }

    // Page.
    if ( is_page() ) {
        $template = isset( $settings['title-page'] ) ? $settings['title-page'] : '';
        if ( $template ) {
            $vars['title'] = get_the_title();
            return snel_seo_resolve_template( $template, $vars );
        }
    }

    return $title;
}, 15 );

/**
 * Output meta description, canonical, and Open Graph tags in <head>.
 */
add_action( 'wp_head', function () {
    $settings = get_option( 'wpseo_titles', array() );
    $vars     = snel_seo_get_vars();

    // ── Meta Description ──
    $description = '';

    // Per-page override (multilingual).
    if ( is_singular() ) {
        $post_id = get_queried_object_id();
        $raw     = get_post_meta( $post_id, '_snel_seo_metadesc', true );
        $descs   = $raw ? json_decode( $raw, true ) : array();
        $lang    = snel_seo_get_current_lang();
        $default = snel_seo_get_default_lang();
        $custom  = ! empty( $descs[ $lang ] ) ? $descs[ $lang ] : ( ! empty( $descs[ $default ] ) ? $descs[ $default ] : '' );
        if ( $custom ) {
            $description = $custom;
        }
    }

    // Fallback to template defaults.
    if ( ! $description ) {
        if ( is_front_page() || is_home() ) {
            $description = isset( $settings['metadesc-home-wpseo'] ) ? $settings['metadesc-home-wpseo'] : '';
        } elseif ( is_singular( 'post' ) ) {
            $description = isset( $settings['metadesc-post'] ) ? $settings['metadesc-post'] : '';
        } elseif ( is_page() ) {
            $description = isset( $settings['metadesc-page'] ) ? $settings['metadesc-page'] : '';
        }
    }

    if ( $description ) {
        $description = snel_seo_resolve_template( $description, $vars );
        printf( '<meta name="description" content="%s" />' . "\n", esc_attr( $description ) );
    }

    // ── Open Graph ──
    $og_title = '';
    $og_desc  = '';
    $og_image = '';
    $og_url   = is_singular() ? get_permalink() : home_url( '/' );

    if ( is_singular() ) {
        $post_id  = get_queried_object_id();
        $og_title = get_post_meta( $post_id, '_yoast_wpseo_opengraph-title', true );
        $og_desc  = get_post_meta( $post_id, '_yoast_wpseo_opengraph-description', true );
        $og_image = get_post_meta( $post_id, '_yoast_wpseo_opengraph-image', true );
    }

    // Fallback OG title to document title.
    if ( ! $og_title ) {
        $og_title = wp_get_document_title();
    }

    // Fallback OG description to meta description.
    if ( ! $og_desc ) {
        $og_desc = $description;
    }

    // Fallback OG image to featured image, then default.
    if ( ! $og_image && is_singular() ) {
        $og_image = get_the_post_thumbnail_url( get_queried_object_id(), 'large' );
    }
    if ( ! $og_image ) {
        $og_image = isset( $settings['default_og_image'] ) ? $settings['default_og_image'] : '';
    }

    if ( $og_title ) {
        printf( '<meta property="og:title" content="%s" />' . "\n", esc_attr( $og_title ) );
    }
    if ( $og_desc ) {
        printf( '<meta property="og:description" content="%s" />' . "\n", esc_attr( $og_desc ) );
    }
    if ( $og_image ) {
        printf( '<meta property="og:image" content="%s" />' . "\n", esc_url( $og_image ) );
    }
    printf( '<meta property="og:url" content="%s" />' . "\n", esc_url( $og_url ) );
    printf( '<meta property="og:type" content="%s" />' . "\n", is_singular() ? 'article' : 'website' );
    printf( '<meta property="og:site_name" content="%s" />' . "\n", esc_attr( $vars['sitename'] ) );
}, 1 );

// ─── Editor Meta Box ─────────────────────────────────────────────────────────

/**
 * Register the SEO meta box below the editor.
 */
add_action( 'add_meta_boxes', function () {
    $post_types = get_post_types( array( 'public' => true ) );
    foreach ( $post_types as $post_type ) {
        add_meta_box(
            'snel-seo-metabox',
            '<span>Snel <em style="font-family:serif;font-style:italic;font-weight:normal;">SEO</em></span>',
            'snel_seo_render_metabox',
            $post_type,
            'normal',
            'high'
        );
    }
} );

/**
 * Render the meta box container (React mounts here).
 */
function snel_seo_render_metabox( $post ) {
    echo '<div id="snel-seo-metabox-root"></div>';
}

/**
 * Enqueue the editor React app on post edit screens.
 */
add_action( 'enqueue_block_editor_assets', function () {
    $asset_file = SNEL_SEO_PLUGIN_DIR . 'build/editor.asset.php';

    if ( ! file_exists( $asset_file ) ) {
        return;
    }

    $asset = require $asset_file;

    wp_enqueue_script(
        'snel-seo-editor',
        SNEL_SEO_PLUGIN_URL . 'build/editor.js',
        $asset['dependencies'],
        $asset['version'],
        true
    );

    wp_enqueue_style(
        'snel-seo-editor',
        SNEL_SEO_PLUGIN_URL . 'build/editor.css',
        array( 'wp-components' ),
        $asset['version']
    );

    $settings = get_option( 'wpseo_titles', array() );

    $languages = snel_seo_get_languages();

    wp_localize_script( 'snel-seo-editor', 'snelSeoEditor', array(
        'restUrl'      => rest_url( 'snel-seo/v1/post-meta' ),
        'generateUrl'  => rest_url( 'snel-seo/v1/generate' ),
        'nonce'        => wp_create_nonce( 'wp_rest' ),
        'languages'    => $languages,
        'defaultLang'  => snel_seo_get_default_lang(),
        'multilingual' => snel_seo_is_multilingual(),
        'settings'     => array(
            'website_name'     => isset( $settings['website_name'] ) ? $settings['website_name'] : get_bloginfo( 'name' ),
            'separator'        => isset( $settings['separator'] ) ? $settings['separator'] : 'sc-dash',
            'default_og_image' => isset( $settings['default_og_image'] ) ? $settings['default_og_image'] : '',
        ),
    ) );
} );

/**
 * Register REST endpoints for per-post SEO meta.
 * Stores as JSON objects: { nl: "...", en: "...", de: "..." }
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'snel-seo/v1', '/post-meta/(?P<id>\d+)', array(
        array(
            'methods'             => 'GET',
            'callback'            => function ( $request ) {
                $post_id   = (int) $request['id'];
                $seo_title = get_post_meta( $post_id, '_snel_seo_title', true );
                $metadesc  = get_post_meta( $post_id, '_snel_seo_metadesc', true );
                $focus_kw  = get_post_meta( $post_id, '_snel_seo_focus_kw', true );

                return rest_ensure_response( array(
                    'seo_title' => $seo_title ? json_decode( $seo_title, true ) : new \stdClass(),
                    'metadesc'  => $metadesc ? json_decode( $metadesc, true ) : new \stdClass(),
                    'focus_kw'  => $focus_kw ? json_decode( $focus_kw, true ) : new \stdClass(),
                ) );
            },
            'permission_callback' => function ( $request ) {
                return current_user_can( 'edit_post', $request['id'] );
            },
        ),
        array(
            'methods'             => 'POST',
            'callback'            => function ( $request ) {
                $post_id = (int) $request['id'];
                $params  = $request->get_json_params();

                if ( isset( $params['seo_title'] ) ) {
                    update_post_meta( $post_id, '_snel_seo_title', wp_json_encode( $params['seo_title'] ) );
                }
                if ( isset( $params['metadesc'] ) ) {
                    update_post_meta( $post_id, '_snel_seo_metadesc', wp_json_encode( $params['metadesc'] ) );
                }
                if ( isset( $params['focus_kw'] ) ) {
                    update_post_meta( $post_id, '_snel_seo_focus_kw', wp_json_encode( $params['focus_kw'] ) );
                }

                return rest_ensure_response( array( 'success' => true ) );
            },
            'permission_callback' => function ( $request ) {
                return current_user_can( 'edit_post', $request['id'] );
            },
        ),
    ) );
} );

/**
 * REST endpoint: AI-generate meta description from post content.
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'snel-seo/v1', '/generate/(?P<id>\d+)', array(
        'methods'             => 'POST',
        'callback'            => 'snel_seo_generate_meta',
        'permission_callback' => function ( $request ) {
            return current_user_can( 'edit_post', $request['id'] );
        },
    ) );
} );

/**
 * Generate SEO meta description or title via OpenAI.
 */
function snel_seo_generate_meta( WP_REST_Request $request ) {
    $post_id = (int) $request['id'];
    $params  = $request->get_json_params();
    $type    = isset( $params['type'] ) ? $params['type'] : 'description';
    $lang    = isset( $params['lang'] ) ? $params['lang'] : snel_seo_get_default_lang();

    $lang_names = array(
        'nl' => 'Dutch', 'en' => 'English', 'de' => 'German',
        'fr' => 'French', 'es' => 'Spanish', 'it' => 'Italian',
        'pt' => 'Portuguese', 'ja' => 'Japanese', 'zh' => 'Chinese',
        'ko' => 'Korean', 'ar' => 'Arabic', 'ru' => 'Russian',
        'pl' => 'Polish', 'tr' => 'Turkish', 'sv' => 'Swedish',
    );
    $lang_name = isset( $lang_names[ $lang ] ) ? $lang_names[ $lang ] : $lang;

    // Get API key from Snelstack settings (unified).
    $api_key = function_exists( 'snelstack_get_openai_key' ) ? snelstack_get_openai_key() : '';
    if ( empty( $api_key ) ) {
        return new WP_Error( 'no_api_key', 'OpenAI API key not configured. Go to Snelstack Settings to add your key.', array( 'status' => 400 ) );
    }

    $post = get_post( $post_id );
    if ( ! $post ) {
        return new WP_Error( 'no_post', 'Post not found.', array( 'status' => 404 ) );
    }

    // Use content from client if provided (extracted from blocks, language-aware).
    // Fall back to server-side extraction for backwards compatibility.
    if ( ! empty( $params['content'] ) ) {
        $content = sanitize_textarea_field( $params['content'] );
    } else {
        $html  = do_blocks( $post->post_content );
        $texts = array();
        if ( preg_match_all( '/<(?:h[1-6]|p)\b[^>]*>(.+?)<\/(?:h[1-6]|p)>/is', $html, $matches ) ) {
            foreach ( $matches[1] as $inner ) {
                $clean = trim( wp_strip_all_tags( $inner ) );
                if ( $clean && strlen( $clean ) > 3 ) {
                    $texts[] = $clean;
                }
            }
        }
        $content = implode( "\n", $texts );
    }
    $content = mb_substr( $content, 0, 3000 );
    $title   = $post->post_title;


    $settings  = get_option( 'wpseo_titles', array() );
    $site_name = isset( $settings['website_name'] ) ? $settings['website_name'] : get_bloginfo( 'name' );
    $separator = snel_seo_get_separator();

    if ( 'title' === $type ) {
        $prompt = "Generate an SEO-optimized title in {$lang_name} for the following page. "
                . "The format should be: [compelling page title] {$separator} {$site_name}. "
                . "The total length must be under 60 characters including the separator and site name. "
                . "Write in {$lang_name}. Return ONLY the full title with separator and site name, nothing else.\n\n"
                . "Page title: {$title}\n"
                . "Page content: {$content}";
    } elseif ( 'keyphrase' === $type ) {
        $source_kw = isset( $params['source_keyphrase'] ) ? sanitize_text_field( $params['source_keyphrase'] ) : '';
        $prompt = "Translate this SEO focus keyphrase to {$lang_name}. "
                . "Keep it concise (1-4 words). It should be the search term a {$lang_name}-speaking user would type into Google. "
                . "Return ONLY the translated keyphrase, nothing else.\n\n"
                . "Keyphrase: {$source_kw}";
    } else {
        $prompt = "Generate an SEO-optimized meta description in {$lang_name} for the following page. "
                . "Keep it between 120-155 characters. Make it compelling and include a call to action if appropriate. "
                . "Write in {$lang_name}. Return ONLY the meta description, nothing else.\n\n"
                . "Page title: {$title}\n"
                . "Page content: {$content}";
    }

    $model = function_exists( 'snelstack_get_openai_model' ) ? snelstack_get_openai_model() : 'gpt-4o-mini';
    $response = wp_remote_post( 'https://api.openai.com/v1/chat/completions', array(
        'timeout' => 30,
        'headers' => array(
            'Authorization' => 'Bearer ' . $api_key,
            'Content-Type'  => 'application/json',
        ),
        'body' => wp_json_encode( array(
            'model'       => $model,
            'messages'    => array(
                array( 'role' => 'system', 'content' => 'You are an SEO expert. Write concise, compelling meta content that drives clicks from search results.' ),
                array( 'role' => 'user', 'content' => $prompt ),
            ),
            'temperature' => 0.7,
        ) ),
    ) );

    if ( is_wp_error( $response ) ) {
        return new WP_Error( 'api_error', $response->get_error_message(), array( 'status' => 500 ) );
    }

    $status_code = wp_remote_retrieve_response_code( $response );
    if ( 200 !== $status_code ) {
        return new WP_Error( 'api_error', 'OpenAI returned status ' . $status_code, array( 'status' => 500 ) );
    }

    $body   = json_decode( wp_remote_retrieve_body( $response ), true );
    $result = trim( $body['choices'][0]['message']['content'] ?? '' );

    // Remove wrapping quotes if present.
    $result = trim( $result, '"\'' );

    return rest_ensure_response( array( 'result' => $result ) );
}

/**
 * Register SEO meta keys so they're accessible via REST API.
 */
add_action( 'init', function () {
    $post_types = get_post_types( array( 'public' => true ) );
    $meta_keys  = array( '_snel_seo_title', '_snel_seo_metadesc', '_snel_seo_focus_kw' );

    foreach ( $post_types as $post_type ) {
        foreach ( $meta_keys as $key ) {
            register_post_meta( $post_type, $key, array(
                'show_in_rest'  => true,
                'single'        => true,
                'type'          => 'string',
                'auth_callback' => function () {
                    return current_user_can( 'edit_posts' );
                },
            ) );
        }
    }
} );
