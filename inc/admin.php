<?php
/**
 * Admin pages — menu registration, script enqueue, settings REST API.
 *
 * @package SnelSEO
 */

defined( 'ABSPATH' ) || exit;

/**
 * Register admin menu and submenu pages.
 */
add_action( 'admin_menu', function () {
    add_menu_page( __( 'Snel SEO', 'snel-seo' ), __( 'Snel SEO', 'snel-seo' ), 'manage_options', 'snel-seo', function () { snel_seo_render_page( 'dashboard' ); }, 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0Ij48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjM2I4MmY2Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjN2MzYWVkIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTIiIGZpbGw9InVybCgjZykiLz48cGF0aCBkPSJNNi41IDEzYS43LjcgMCAwIDEtLjU1LTEuMTRsNi45My03LjE0YS4zNS4zNSAwIDAgMSAuNi4zMkwxMi4xNCA5LjJhLjcuNyAwIDAgMCAuNjYuOTVoNC45YS43LjcgMCAwIDEgLjU1IDEuMTRsLTYuOTMgNy4xNGEuMzUuMzUgMCAwIDEtLjYtLjMybDEuMzQtNC4yMUEuNy43IDAgMCAwIDExLjQgMTN6IiBmaWxsPSIjZmZmIi8+PC9zdmc+', 27 );
    add_submenu_page( 'snel-seo', __( 'Dashboard', 'snel-seo' ), __( 'Dashboard', 'snel-seo' ), 'manage_options', 'snel-seo', function () { snel_seo_render_page( 'dashboard' ); } );
    add_submenu_page( 'snel-seo', __( 'Settings', 'snel-seo' ), __( 'Settings', 'snel-seo' ), 'manage_options', 'snel-seo-settings', function () { snel_seo_render_page( 'settings' ); } );
    add_submenu_page( 'snel-seo', __( 'Redirects', 'snel-seo' ), __( 'Redirects', 'snel-seo' ), 'manage_options', 'snel-seo-redirects', function () { snel_seo_render_page( 'redirects' ); } );
    add_submenu_page( 'snel-seo', __( 'Sitemap', 'snel-seo' ), __( 'Sitemap', 'snel-seo' ), 'manage_options', 'snel-seo-sitemap', function () { snel_seo_render_page( 'sitemap' ); } );
    add_submenu_page( 'snel-seo', __( 'Tools', 'snel-seo' ), __( 'Tools', 'snel-seo' ), 'manage_options', 'snel-seo-tools', function () { snel_seo_render_page( 'tools' ); } );
} );

function snel_seo_render_page( $page ) {
    printf( '<div id="snel-seo-root" class="wrap" data-page="%s"></div>', esc_attr( $page ) );
}

/**
 * Enqueue admin React app on Snel SEO pages.
 */
add_action( 'admin_enqueue_scripts', function ( $hook ) {
    $seo_pages = array( 'toplevel_page_snel-seo', 'snel-seo_page_snel-seo-settings', 'snel-seo_page_snel-seo-redirects', 'snel-seo_page_snel-seo-sitemap', 'snel-seo_page_snel-seo-tools' );
    if ( ! in_array( $hook, $seo_pages, true ) ) return;

    $asset_file = SNEL_SEO_PLUGIN_DIR . 'build/index.asset.php';
    if ( ! file_exists( $asset_file ) ) return;

    $asset = require $asset_file;

    wp_enqueue_script( 'snel-seo-admin', SNEL_SEO_PLUGIN_URL . 'build/index.js', $asset['dependencies'], $asset['version'], true );
    wp_enqueue_style( 'snel-seo-admin', SNEL_SEO_PLUGIN_URL . 'build/index.css', array( 'wp-components' ), $asset['version'] );
    wp_enqueue_media();

    $settings = get_option( SnelSeoConfig::$option_titles, array() );

    $languages    = snel_seo_get_languages();
    $default_lang = snel_seo_get_default_lang();
    $multilingual = snel_seo_is_multilingual();

    // Multilingual settings: decode JSON strings back to objects for the frontend.
    $ml_keys = array(
        'title_home'    => 'title-home-wpseo',
        'metadesc_home' => 'metadesc-home-wpseo',
        'title_post'    => 'title-post',
        'metadesc_post' => 'metadesc-post',
        'title_page'    => 'title-page',
        'metadesc_page' => 'metadesc-page',
    );
    $settings_out = array(
        'website_name'         => isset( $settings['website_name'] ) ? $settings['website_name'] : get_bloginfo( 'name' ),
        'separator'            => isset( $settings['separator'] ) ? $settings['separator'] : 'sc-dash',
        'default_og_image'     => isset( $settings['default_og_image'] ) ? $settings['default_og_image'] : '',
        'post_type_settings'   => get_option( SnelSeoConfig::$option_cpt, array() ),
    );
    $ml_defaults = array(
        'title_home'    => '%%sitename%% %%separator%% %%sitedesc%%',
        'metadesc_home' => '',
        'title_post'    => '%%title%% %%separator%% %%sitename%%',
        'metadesc_post' => '',
        'title_page'    => '%%title%% %%separator%% %%sitename%%',
        'metadesc_page' => '',
    );
    foreach ( $ml_keys as $js_key => $wp_key ) {
        $raw = isset( $settings[ $wp_key ] ) ? $settings[ $wp_key ] : $ml_defaults[ $js_key ];
        if ( $multilingual && is_string( $raw ) ) {
            $decoded = json_decode( $raw, true );
            if ( is_array( $decoded ) ) {
                $settings_out[ $js_key ] = $decoded;
            } else {
                // Legacy plain string — wrap in default lang
                $settings_out[ $js_key ] = $raw ? array( $default_lang => $raw ) : array();
            }
        } else {
            $settings_out[ $js_key ] = $raw;
        }
    }

    wp_localize_script( 'snel-seo-admin', 'snelSeo', array(
        'restUrl'      => rest_url( SnelSeoConfig::$rest_namespace ),
        'nonce'        => wp_create_nonce( 'wp_rest' ),
        'version'      => SNEL_SEO_VERSION,
        'settings'     => $settings_out,
        'multilingual' => $multilingual,
        'languages'    => $languages,
        'defaultLang'  => $default_lang,
        'favicon'      => get_site_icon_url( 28 ),
        'siteUrl'      => home_url(),
        'siteName'     => get_bloginfo( 'name' ),
        'siteDesc'     => get_bloginfo( 'description' ),
        'postTypes'    => snel_seo_get_custom_post_types_with_meta(),
        'config'       => SnelSeoConfig::to_js(),
    ) );
} );

/**
 * Settings save endpoint.
 */
add_action( 'rest_api_init', function () {
    register_rest_route( SnelSeoConfig::$rest_namespace, '/settings', array(
        'methods'             => 'POST',
        'callback'            => 'snel_seo_save_settings',
        'permission_callback' => function () { return current_user_can( 'manage_options' ); },
    ) );

    register_rest_route( SnelSeoConfig::$rest_namespace, '/settings/translate', array(
        'methods'             => 'POST',
        'callback'            => 'snel_seo_translate_setting',
        'permission_callback' => function () { return current_user_can( 'manage_options' ); },
    ) );
} );

function snel_seo_save_settings( WP_REST_Request $request ) {
    $params   = $request->get_json_params();
    $settings = get_option( SnelSeoConfig::$option_titles, array() );

    // Keys that stay as plain strings.
    $plain_keys = array(
        'website_name'     => 'website_name',
        'separator'        => 'separator',
        'default_og_image' => 'default_og_image',
    );

    // Keys that can be multilingual (saved as JSON string when object).
    $ml_keys = array(
        'title_home'    => 'title-home-wpseo',
        'metadesc_home' => 'metadesc-home-wpseo',
        'title_post'    => 'title-post',
        'metadesc_post' => 'metadesc-post',
        'title_page'    => 'title-page',
        'metadesc_page' => 'metadesc-page',
    );

    foreach ( $plain_keys as $js_key => $wp_key ) {
        if ( isset( $params[ $js_key ] ) ) {
            $settings[ $wp_key ] = sanitize_text_field( $params[ $js_key ] );
        }
    }

    foreach ( $ml_keys as $js_key => $wp_key ) {
        if ( isset( $params[ $js_key ] ) ) {
            $value = $params[ $js_key ];
            if ( is_array( $value ) ) {
                // Sanitize each language value and store as JSON string.
                $sanitized = array();
                foreach ( $value as $lang => $text ) {
                    $sanitized[ sanitize_key( $lang ) ] = sanitize_text_field( $text );
                }
                $settings[ $wp_key ] = wp_json_encode( $sanitized );
            } else {
                $settings[ $wp_key ] = sanitize_text_field( $value );
            }
        }
    }

    update_option( SnelSeoConfig::$option_titles, $settings );

    // Save post type settings (fallback keys + templates per CPT).
    if ( isset( $params['post_type_settings'] ) && is_array( $params['post_type_settings'] ) ) {
        $cpt_settings = array();
        foreach ( $params['post_type_settings'] as $cpt_name => $cpt_config ) {
            $safe_name = sanitize_key( $cpt_name );
            $cpt_settings[ $safe_name ] = array();

            // Fallback keys — array of strings.
            if ( isset( $cpt_config['desc_fallback_keys'] ) && is_array( $cpt_config['desc_fallback_keys'] ) ) {
                $cpt_settings[ $safe_name ]['desc_fallback_keys'] = array_map( 'sanitize_text_field', $cpt_config['desc_fallback_keys'] );
            }

            // Title and meta description templates — can be multilingual objects or plain strings.
            foreach ( array( 'title_template', 'metadesc_template' ) as $tpl_key ) {
                if ( isset( $cpt_config[ $tpl_key ] ) ) {
                    $value = $cpt_config[ $tpl_key ];
                    if ( is_array( $value ) ) {
                        $sanitized = array();
                        foreach ( $value as $lang => $text ) {
                            $sanitized[ sanitize_key( $lang ) ] = sanitize_text_field( $text );
                        }
                        $cpt_settings[ $safe_name ][ $tpl_key ] = $sanitized;
                    } else {
                        $cpt_settings[ $safe_name ][ $tpl_key ] = sanitize_text_field( $value );
                    }
                }
            }
        }
        update_option( SnelSeoConfig::$option_cpt, $cpt_settings );
    }

    return rest_ensure_response( array( 'success' => true ) );
}

/**
 * Translate a settings template text to another language via OpenAI.
 */
function snel_seo_translate_setting( WP_REST_Request $request ) {
    $params = $request->get_json_params();
    $text   = sanitize_text_field( $params['text'] ?? '' );
    $lang   = sanitize_key( $params['lang'] ?? '' );
    $type   = sanitize_key( $params['type'] ?? 'description' );

    if ( ! $text || ! $lang ) {
        return new WP_Error( 'missing_params', 'Text and lang are required.', array( 'status' => 400 ) );
    }

    $api_key = SnelSeoConfig::ai_key();
    if ( empty( $api_key ) ) {
        return new WP_Error( 'no_api_key', 'OpenAI API key not configured. Go to Snelstack Settings to add your key.', array( 'status' => 400 ) );
    }

    $lang_name     = SnelSeoConfig::lang_name( $lang );
    $max_title     = SnelSeoConfig::$max_title_length;
    $max_desc      = SnelSeoConfig::$max_desc_length;

    if ( 'title' === $type ) {
        $prompt = "Translate this SEO title template to {$lang_name}. "
                . "Keep template variables like %%sitename%%, %%separator%%, %%sitedesc%%, %%title%% exactly as they are — do not translate them. "
                . "Only translate the human-readable text parts. Keep it under {$max_title} characters. "
                . "Return ONLY the translated title, nothing else.\n\nTitle: {$text}";
    } else {
        $prompt = "Translate this SEO meta description to {$lang_name}. "
                . "Keep template variables like %%sitename%%, %%sitedesc%% exactly as they are — do not translate them. "
                . "Only translate the human-readable text parts. Keep it between 120-{$max_desc} characters. "
                . "Return ONLY the translated description, nothing else.\n\nDescription: {$text}";
    }

    $response = wp_remote_post( SnelSeoConfig::$ai_api_url, array(
        'timeout' => 30,
        'headers' => array( 'Authorization' => 'Bearer ' . $api_key, 'Content-Type' => 'application/json' ),
        'body'    => wp_json_encode( array(
            'model'       => SnelSeoConfig::ai_model(),
            'messages'    => array(
                array( 'role' => 'system', 'content' => 'You are a professional translator specializing in SEO content. Translate accurately while preserving template variables.' ),
                array( 'role' => 'user', 'content' => $prompt ),
            ),
            'temperature' => SnelSeoConfig::$ai_temp_translation,
        ) ),
    ) );

    if ( is_wp_error( $response ) ) {
        return new WP_Error( 'api_error', $response->get_error_message(), array( 'status' => 500 ) );
    }

    $body = json_decode( wp_remote_retrieve_body( $response ), true );
    $result = $body['choices'][0]['message']['content'] ?? '';
    $result = trim( $result, " \t\n\r\0\x0B\"'" );

    return rest_ensure_response( array( 'result' => $result ) );
}

/**
 * Get all custom post types with their available meta keys from the database.
 * Excludes built-in types (post, page, attachment) since those have their own tabs.
 *
 * Each field is returned with:
 *   - key:    identifier used for saving config (e.g. '_product_description', '_title_{lang}')
 *   - label:  human-readable name (e.g. 'Short description', 'Title')
 *   - type:   'multilingual' (single key, value is array of langs),
 *             'per_lang' (grouped from _key_nl, _key_de, etc.),
 *             'plain' (single value)
 *   - keys:   (per_lang only) map of lang code → meta key
 */
function snel_seo_get_custom_post_types_with_meta() {
    global $wpdb;

    $post_types = get_post_types( array( 'public' => true ), 'objects' );
    $exclude    = array( 'post', 'page', 'attachment' );
    $languages  = snel_seo_get_languages();
    $lang_codes = wp_list_pluck( $languages, 'code' );
    $result     = array();

    foreach ( $post_types as $pt ) {
        if ( in_array( $pt->name, $exclude, true ) ) {
            continue;
        }

        // Get all distinct meta keys used on published posts of this type.
        $meta_keys = $wpdb->get_col( $wpdb->prepare(
            "SELECT DISTINCT pm.meta_key
             FROM {$wpdb->postmeta} pm
             INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
             WHERE p.post_type = %s
               AND p.post_status = 'publish'
               AND pm.meta_key NOT LIKE %s
             ORDER BY pm.meta_key ASC",
            $pt->name,
            $wpdb->esc_like( '_edit_' ) . '%'
        ) );

        // Filter out internal WP keys and SEO plugin's own keys.
        $skip_prefixes = SnelSeoConfig::$meta_skip_prefixes;
        $filtered = array();
        foreach ( $meta_keys as $key ) {
            $skip = false;
            foreach ( $skip_prefixes as $prefix ) {
                if ( strpos( $key, $prefix ) === 0 ) {
                    $skip = true;
                    break;
                }
            }
            if ( ! $skip ) {
                $filtered[] = $key;
            }
        }

        // Detect per-language keys (e.g. _title_nl, _title_de → group as "Title").
        $per_lang_groups = array(); // base_key => array( lang_code => meta_key )
        $standalone      = array(); // keys that are not per-language

        foreach ( $filtered as $key ) {
            $matched = false;
            foreach ( $lang_codes as $code ) {
                $suffix = '_' . $code;
                if ( substr( $key, -strlen( $suffix ) ) === $suffix ) {
                    $base = substr( $key, 0, -strlen( $suffix ) );
                    $per_lang_groups[ $base ][ $code ] = $key;
                    $matched = true;
                    break;
                }
            }
            if ( ! $matched ) {
                $standalone[] = $key;
            }
        }

        // Only keep per-lang groups that have at least 2 languages.
        foreach ( $per_lang_groups as $base => $langs ) {
            if ( count( $langs ) < 2 ) {
                // Treat as standalone instead.
                foreach ( $langs as $meta_key ) {
                    $standalone[] = $meta_key;
                }
                unset( $per_lang_groups[ $base ] );
            }
        }

        // Sample one published post to detect multilingual arrays.
        $sample_id = $wpdb->get_var( $wpdb->prepare(
            "SELECT ID FROM {$wpdb->posts} WHERE post_type = %s AND post_status = 'publish' LIMIT 1",
            $pt->name
        ) );

        // Build the final fields list.
        $fields = array();

        foreach ( $standalone as $key ) {
            $type = 'plain';

            // Check if value is a serialized multilingual array.
            if ( $sample_id ) {
                $val = get_post_meta( $sample_id, $key, true );
                if ( is_array( $val ) ) {
                    // Check if keys are language codes.
                    $val_keys    = array_keys( $val );
                    $lang_overlap = array_intersect( $val_keys, $lang_codes );
                    if ( count( $lang_overlap ) >= 2 ) {
                        $type = 'multilingual';
                    }
                }
            }

            $fields[] = array(
                'key'   => $key,
                'label' => snel_seo_meta_key_to_label( $key ),
                'type'  => $type,
            );
        }

        foreach ( $per_lang_groups as $base => $langs ) {
            $fields[] = array(
                'key'   => $base . '_{lang}',
                'label' => snel_seo_meta_key_to_label( $base ),
                'type'  => 'per_lang',
                'keys'  => $langs,
            );
        }

        $result[] = array(
            'name'   => $pt->name,
            'label'  => $pt->labels->name,
            'fields' => $fields,
        );
    }

    return $result;
}

/**
 * Convert a meta key to a human-readable label.
 * e.g. '_product_short_description' → 'Product short description'
 *      '_event_summary' → 'Event summary'
 *      '_price' → 'Price'
 */
function snel_seo_meta_key_to_label( $key ) {
    $label = ltrim( $key, '_' );
    $label = str_replace( '_', ' ', $label );
    $label = ucfirst( $label );

    return $label;
}
