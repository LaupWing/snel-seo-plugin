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
        'site_tagline'  => 'site_tagline',
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
        'taxonomy_settings'    => get_option( SnelSeoConfig::$option_tax, array() ),
    );
    $ml_defaults = array(
        'site_tagline'  => '',
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
        'taxonomies'   => snel_seo_get_public_taxonomies(),
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

    // Export all site URLs.
    register_rest_route( SnelSeoConfig::$rest_namespace, '/export-urls', array(
        'methods'             => 'GET',
        'callback'            => function () {
            $result = array();

            // Pages.
            $pages = get_posts( array( 'post_type' => 'page', 'post_status' => 'publish', 'numberposts' => -1 ) );
            foreach ( $pages as $page ) {
                $result[] = array( 'url' => get_permalink( $page ), 'type' => 'page', 'title' => $page->post_title );
            }

            // Posts.
            $posts = get_posts( array( 'post_type' => 'post', 'post_status' => 'publish', 'numberposts' => -1 ) );
            foreach ( $posts as $post ) {
                $result[] = array( 'url' => get_permalink( $post ), 'type' => 'post', 'title' => $post->post_title );
            }

            // All public custom post types.
            $cpts = get_post_types( array( 'public' => true, '_builtin' => false ), 'names' );
            foreach ( $cpts as $cpt ) {
                $items = get_posts( array( 'post_type' => $cpt, 'post_status' => 'publish', 'numberposts' => -1 ) );
                foreach ( $items as $item ) {
                    $result[] = array( 'url' => get_permalink( $item ), 'type' => $cpt, 'title' => $item->post_title );
                }
            }

            // Public taxonomy term archives.
            $taxonomies = get_taxonomies( array( 'public' => true ), 'names' );
            foreach ( $taxonomies as $tax ) {
                $terms = get_terms( array( 'taxonomy' => $tax, 'hide_empty' => false ) );
                if ( is_wp_error( $terms ) ) continue;
                foreach ( $terms as $term ) {
                    $link = get_term_link( $term );
                    if ( ! is_wp_error( $link ) ) {
                        $result[] = array( 'url' => $link, 'type' => $tax, 'title' => $term->name );
                    }
                }
            }

            return rest_ensure_response( array(
                'total' => count( $result ),
                'urls'  => $result,
            ) );
        },
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
        'site_tagline'  => 'site_tagline',
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

            // Schema type and field mapping.
            if ( isset( $cpt_config['schema_type'] ) ) {
                $cpt_settings[ $safe_name ]['schema_type'] = sanitize_text_field( $cpt_config['schema_type'] );
            }
            if ( isset( $cpt_config['schema_fields'] ) && is_array( $cpt_config['schema_fields'] ) ) {
                $schema_fields = array();
                foreach ( $cpt_config['schema_fields'] as $field_key => $field_value ) {
                    $schema_fields[ sanitize_key( $field_key ) ] = sanitize_text_field( $field_value );
                }
                $cpt_settings[ $safe_name ]['schema_fields'] = $schema_fields;
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

    // Save taxonomy settings (title + meta description templates per taxonomy).
    if ( isset( $params['taxonomy_settings'] ) && is_array( $params['taxonomy_settings'] ) ) {
        $tax_settings = array();
        foreach ( $params['taxonomy_settings'] as $tax_name => $tax_config ) {
            $safe_name = sanitize_key( $tax_name );
            $tax_settings[ $safe_name ] = array();

            foreach ( array( 'title_template', 'metadesc_template' ) as $tpl_key ) {
                if ( isset( $tax_config[ $tpl_key ] ) ) {
                    $value = $tax_config[ $tpl_key ];
                    if ( is_array( $value ) ) {
                        $sanitized = array();
                        foreach ( $value as $lang => $text ) {
                            $sanitized[ sanitize_key( $lang ) ] = sanitize_text_field( $text );
                        }
                        $tax_settings[ $safe_name ][ $tpl_key ] = $sanitized;
                    } else {
                        $tax_settings[ $safe_name ][ $tpl_key ] = sanitize_text_field( $value );
                    }
                }
            }
        }
        update_option( SnelSeoConfig::$option_tax, $tax_settings );
    }

    return rest_ensure_response( array( 'success' => true ) );
}

/**
 * Translate a settings template text to another language via OpenAI.
 * Uses snel_seo_translate_text() which safely preserves %%tags%%.
 */
function snel_seo_translate_setting( WP_REST_Request $request ) {
    $params = $request->get_json_params();
    $text   = sanitize_text_field( $params['text'] ?? '' );
    $lang   = sanitize_key( $params['lang'] ?? '' );
    $type   = sanitize_key( $params['type'] ?? 'description' );

    $result = snel_seo_translate_text( $text, $lang, $type );

    if ( is_wp_error( $result ) ) {
        return $result;
    }

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

        // Get taxonomies for this CPT.
        $tax_objects = get_object_taxonomies( $pt->name, 'objects' );
        $taxonomies  = array();
        foreach ( $tax_objects as $tax ) {
            if ( $tax->public ) {
                $taxonomies[] = array( 'name' => $tax->name, 'label' => $tax->labels->name );
            }
        }

        $result[] = array(
            'name'       => $pt->name,
            'label'      => $pt->labels->name,
            'fields'     => $fields,
            'taxonomies' => $taxonomies,
        );
    }

    return $result;
}

/**
 * Get all public taxonomies (excluding built-in post tags/categories).
 */
function snel_seo_get_public_taxonomies() {
    $taxonomies = get_taxonomies( array( 'public' => true ), 'objects' );
    $exclude    = array( 'category', 'post_tag', 'post_format' );
    $result     = array();

    foreach ( $taxonomies as $tax ) {
        if ( in_array( $tax->name, $exclude, true ) ) {
            continue;
        }
        $result[] = array(
            'name'  => $tax->name,
            'label' => $tax->labels->name,
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

/**
 * Add SEO hints to taxonomy edit screens.
 * Shows a note below the description field explaining how it feeds into Snel SEO templates.
 */
add_action( 'admin_init', function () {
    $taxonomies = get_taxonomies( array( 'public' => true ), 'names' );
    foreach ( $taxonomies as $tax ) {
        add_action( $tax . '_edit_form_fields', 'snel_seo_taxonomy_description_hint', 11, 2 );
        add_action( $tax . '_edit_form', 'snel_seo_taxonomy_metabox', 10, 2 );
        add_action( 'edited_' . $tax, 'snel_seo_taxonomy_metabox_save', 10, 2 );
    }
} );

function snel_seo_taxonomy_description_hint( $term, $taxonomy ) {
    ?>
    <tr class="form-field">
        <th scope="row"></th>
        <td>
            <p class="description" style="margin-top: -8px; color: #2271b1;">
                <strong>Snel SEO:</strong>
                <?php
                printf(
                    /* translators: 1: %%term_description%% tag */
                    esc_html__( 'The Name and Description above are used as %1$s and %2$s in your SEO templates.', 'snel-seo' ),
                    '<code>%%term_title%%</code>',
                    '<code>%%term_description%%</code>'
                );
                ?>
            </p>
        </td>
    </tr>
    <?php
}

/**
 * Render SEO meta box on taxonomy edit screen with Preview + Custom SEO tabs.
 */
function snel_seo_taxonomy_metabox( $term, $taxonomy ) {
    $languages    = snel_seo_get_languages();
    $default_lang = snel_seo_get_default_lang();
    $multilingual = snel_seo_is_multilingual();

    $settings  = get_option( SnelSeoConfig::$option_titles, array() );
    $site_name = isset( $settings['website_name'] ) ? $settings['website_name'] : get_bloginfo( 'name' );
    $separator = SnelSeoConfig::get_separator();

    // Load existing SEO meta.
    $raw_title = get_term_meta( $term->term_id, '_snel_seo_title', true );
    $raw_desc  = get_term_meta( $term->term_id, '_snel_seo_metadesc', true );
    $seo_titles = $raw_title ? json_decode( $raw_title, true ) : array();
    $seo_descs  = $raw_desc ? json_decode( $raw_desc, true ) : array();
    if ( ! is_array( $seo_titles ) ) $seo_titles = array();
    if ( ! is_array( $seo_descs ) ) $seo_descs = array();

    $term_link = get_term_link( $term );
    $domain    = wp_parse_url( home_url(), PHP_URL_HOST ) ?: 'example.com';
    $url_parts = explode( '/', trim( wp_parse_url( is_wp_error( $term_link ) ? '' : $term_link, PHP_URL_PATH ) ?: '', '/' ) );
    $url_path  = implode( ' › ', array_filter( $url_parts ) );
    $favicon   = get_site_icon_url( 28 );
    $rest_url  = rest_url( SnelSeoConfig::$rest_namespace );
    $nonce     = wp_create_nonce( 'wp_rest' );

    wp_nonce_field( 'snel_seo_tax_metabox', 'snel_seo_tax_nonce' );
    ?>

    <div class="snel-seo-classic" style="margin-top:20px;">
        <h2 style="font-size:14px;margin:0 0 12px;">Snel <em style="font-family:serif;font-style:italic;font-weight:normal;">SEO</em></h2>

        <!-- Tabs -->
        <div class="snel-seo-tabs" style="display:flex;gap:0;border-bottom:2px solid #e0e0e0;margin-bottom:16px;">
            <button type="button" class="snel-seo-tax-tab active" data-tab="preview" style="padding:8px 16px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#999;background:none;border:none;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all 0.15s;display:flex;align-items:center;gap:6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                <?php esc_html_e( 'Preview', 'snel-seo' ); ?>
            </button>
            <button type="button" class="snel-seo-tax-tab" data-tab="custom-seo" style="padding:8px 16px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#999;background:none;border:none;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all 0.15s;display:flex;align-items:center;gap:6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>
                <?php esc_html_e( 'Custom SEO', 'snel-seo' ); ?>
            </button>
        </div>

        <!-- Preview Tab -->
        <div class="snel-seo-tax-panel active" data-tab="preview">
            <?php if ( $multilingual ) : ?>
            <div style="display:flex;gap:4px;margin-bottom:12px;">
                <?php foreach ( $languages as $lang ) : ?>
                    <button type="button" class="snel-seo-tax-lang-btn<?php echo $lang['code'] === $default_lang ? ' active' : ''; ?>" data-lang="<?php echo esc_attr( $lang['code'] ); ?>" style="padding:4px 12px;border:1px solid #c3c4c7;background:<?php echo $lang['code'] === $default_lang ? '#2271b1;color:#fff;border-color:#2271b1' : '#f0f0f1;color:#50575e'; ?>;cursor:pointer;font-size:12px;font-weight:600;border-radius:3px;">
                        <?php echo esc_html( $lang['label'] ); ?>
                        <?php if ( $lang['default'] ) : ?><span style="font-size:10px;">(<?php esc_html_e( 'default', 'snel-seo' ); ?>)</span><?php endif; ?>
                    </button>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>

            <div style="background:#f0f6fc;border:1px solid #c5d9ed;border-radius:4px;padding:10px 14px;font-size:12px;color:#2271b1;margin-bottom:14px;">
                <?php esc_html_e( 'This preview shows how your category appears in Google. Title and description are generated from your SEO templates and term fields. Use the "Custom SEO" tab to override.', 'snel-seo' ); ?>
            </div>

            <?php foreach ( $languages as $lang ) :
                $code = $lang['code'];
                $is_active = ( $code === $default_lang );

                // Get translated term name.
                $term_name = $term->name;
                if ( $code !== $default_lang ) {
                    $translated_name = get_term_meta( $term->term_id, '_name_' . $code, true );
                    if ( $translated_name ) $term_name = $translated_name;
                }

                // Get description for preview.
                $term_desc = $term->description;
                if ( $code !== $default_lang ) {
                    $translated_desc = get_term_meta( $term->term_id, '_desc_' . $code, true );
                    if ( $translated_desc ) $term_desc = $translated_desc;
                }

                // Check for SEO overrides.
                $seo_t = isset( $seo_titles[ $code ] ) ? $seo_titles[ $code ] : '';
                $seo_d = isset( $seo_descs[ $code ] ) ? $seo_descs[ $code ] : '';

                $preview_title = ( $seo_t ?: $term_name ) . ' ' . $separator . ' ' . $site_name;
                $preview_desc  = $seo_d ?: ( $term_desc ?: '' );
            ?>
            <div class="snel-seo-tax-lang-preview" data-lang="<?php echo esc_attr( $code ); ?>" <?php echo $is_active ? '' : 'style="display:none;"'; ?>>
                <div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:16px;">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
                        <svg width="14" height="14" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#34A853" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.77-4.59l-7.98-6.19A23.99 23.99 0 000 24c0 3.77.9 7.35 2.56 10.52l7.97-5.93z"/><path fill="#FBBC05" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.93C6.51 42.62 14.62 48 24 48z"/></svg>
                        <span style="font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.5px;font-weight:500;"><?php esc_html_e( 'Google Preview', 'snel-seo' ); ?></span>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                        <div style="width:28px;height:28px;background:#f1f3f4;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                            <?php if ( $favicon ) : ?><img src="<?php echo esc_url( $favicon ); ?>" alt="" style="width:20px;height:20px;object-fit:contain;"><?php endif; ?>
                        </div>
                        <div>
                            <div style="font-size:13px;color:#202124;"><?php echo esc_html( $domain ); ?></div>
                            <div style="font-size:12px;color:#5f6368;"><?php echo esc_html( $url_path ); ?></div>
                        </div>
                    </div>
                    <div style="font-size:20px;line-height:1.3;color:#1a0dab;font-family:arial,sans-serif;margin:4px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><?php echo esc_html( $preview_title ); ?></div>
                    <p style="font-size:14px;color:#4d5156;font-family:arial,sans-serif;line-height:1.58;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;"><?php echo esc_html( $preview_desc ?: __( 'Auto-generated from your term description and templates.', 'snel-seo' ) ); ?></p>
                </div>
            </div>
            <?php endforeach; ?>
        </div>

        <!-- Custom SEO Tab -->
        <div class="snel-seo-tax-panel" data-tab="custom-seo" style="display:none;">
            <div style="background:#fcf9e8;border:1px solid #dba617;border-radius:4px;padding:10px 14px;font-size:12px;color:#8a6d00;margin-bottom:14px;">
                <?php esc_html_e( 'These fields are optional overrides. If left empty, your SEO templates and term fields will be used automatically.', 'snel-seo' ); ?>
            </div>

            <?php if ( $multilingual ) : ?>
            <div style="display:flex;gap:4px;align-items:center;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #e0e0e0;">
                <?php foreach ( $languages as $lang ) :
                    $code = $lang['code'];
                    $has_title = ! empty( $seo_titles[ $code ] );
                    $has_desc  = ! empty( $seo_descs[ $code ] );
                    $dot_class = '';
                    if ( ! $lang['default'] ) {
                        if ( $has_title && $has_desc ) $dot_class = 'snel-seo-dot-green';
                        elseif ( $has_title || $has_desc ) $dot_class = 'snel-seo-dot-amber';
                        else $dot_class = 'snel-seo-dot-gray';
                    }
                ?>
                    <button type="button" class="snel-seo-tax-lang-btn<?php echo $code === $default_lang ? ' active' : ''; ?>" data-lang="<?php echo esc_attr( $code ); ?>" style="padding:4px 12px;border:1px solid #c3c4c7;background:<?php echo $code === $default_lang ? '#2271b1;color:#fff;border-color:#2271b1' : '#f0f0f1;color:#50575e'; ?>;cursor:pointer;font-size:12px;font-weight:600;border-radius:3px;position:relative;">
                        <?php echo esc_html( $lang['label'] ); ?>
                        <?php if ( $lang['default'] ) : ?><span style="font-size:10px;">(<?php esc_html_e( 'default', 'snel-seo' ); ?>)</span><?php endif; ?>
                        <?php if ( $dot_class ) : ?><span style="display:inline-block;width:6px;height:6px;border-radius:50%;margin-left:4px;vertical-align:middle;background:<?php echo $dot_class === 'snel-seo-dot-green' ? '#00a32a' : ( $dot_class === 'snel-seo-dot-amber' ? '#dba617' : '#c3c4c7' ); ?>;"></span><?php endif; ?>
                    </button>
                <?php endforeach; ?>

                <button type="button" class="button" id="snel-seo-tax-translate-btn" style="margin-left:12px;color:#6b21a8;border-color:#d8b4fe;background:#faf5ff;">
                    &#10022; <span id="snel-seo-tax-translate-label"><?php esc_html_e( 'Translate All', 'snel-seo' ); ?></span>
                </button>
                <span id="snel-seo-tax-translate-status" style="margin-left:8px;font-style:italic;color:#666;font-size:12px;"></span>
            </div>
            <?php endif; ?>

            <?php foreach ( $languages as $lang ) :
                $code = $lang['code'];
                $is_active = ( $code === $default_lang );
                $seo_t = isset( $seo_titles[ $code ] ) ? $seo_titles[ $code ] : '';
                $seo_d = isset( $seo_descs[ $code ] ) ? $seo_descs[ $code ] : '';
            ?>
            <div class="snel-seo-tax-lang-custom" data-lang="<?php echo esc_attr( $code ); ?>" <?php echo $is_active ? '' : 'style="display:none;"'; ?>>
                <div style="margin-bottom:14px;">
                    <label style="display:block;font-weight:600;font-size:12px;margin-bottom:4px;text-transform:uppercase;color:#50575e;">
                        <?php esc_html_e( 'SEO Title Override', 'snel-seo' ); ?>
                        <?php if ( $multilingual ) echo '(' . strtoupper( $code ) . ')'; ?>
                    </label>
                    <p class="description" style="font-size:11px;color:#888;margin:2px 0 6px;">
                        <?php esc_html_e( 'Leave empty to use the template.', 'snel-seo' ); ?>
                    </p>
                    <input type="text" name="snel_seo_tax_title[<?php echo esc_attr( $code ); ?>]" value="<?php echo esc_attr( $seo_t ); ?>" class="snel-seo-tax-title large-text" data-lang="<?php echo esc_attr( $code ); ?>" placeholder="<?php echo esc_attr( $term->name ); ?>">
                </div>
                <div style="margin-bottom:14px;">
                    <label style="display:block;font-weight:600;font-size:12px;margin-bottom:4px;text-transform:uppercase;color:#50575e;">
                        <?php esc_html_e( 'Meta Description Override', 'snel-seo' ); ?>
                        <?php if ( $multilingual ) echo '(' . strtoupper( $code ) . ')'; ?>
                    </label>
                    <p class="description" style="font-size:11px;color:#888;margin:2px 0 6px;">
                        <?php esc_html_e( 'Leave empty to use term description and templates.', 'snel-seo' ); ?>
                    </p>
                    <textarea name="snel_seo_tax_desc[<?php echo esc_attr( $code ); ?>]" rows="3" class="snel-seo-tax-desc large-text" data-lang="<?php echo esc_attr( $code ); ?>" maxlength="320" placeholder="<?php esc_attr_e( 'Only fill this in to override the auto-generated description...', 'snel-seo' ); ?>"><?php echo esc_textarea( $seo_d ); ?></textarea>
                    <div style="font-size:11px;color:#888;margin-top:2px;"><span class="snel-seo-tax-char"><?php echo mb_strlen( $seo_d ); ?></span> / 160</div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>

    <script>
    (function(){
        var defaultLang = '<?php echo esc_js( $default_lang ); ?>';
        var currentLang = defaultLang;
        var restUrl = '<?php echo esc_js( $rest_url ); ?>';
        var nonce = '<?php echo esc_js( $nonce ); ?>';
        var languages = <?php echo wp_json_encode( array_map( function( $l ) { return $l['code']; }, $languages ) ); ?>;

        // Tab switching.
        document.querySelectorAll('.snel-seo-tax-tab').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                var tab = this.dataset.tab;
                document.querySelectorAll('.snel-seo-tax-tab').forEach(function(b) {
                    b.style.color = '#999'; b.style.borderBottomColor = 'transparent';
                });
                this.style.color = '#2271b1'; this.style.borderBottomColor = '#2271b1';
                document.querySelectorAll('.snel-seo-tax-panel').forEach(function(p) {
                    p.style.display = p.dataset.tab === tab ? '' : 'none';
                    if (p.dataset.tab === tab) p.classList.add('active'); else p.classList.remove('active');
                });
                syncLang();
            });
        });
        // Set initial active tab style.
        document.querySelector('.snel-seo-tax-tab.active').style.color = '#2271b1';
        document.querySelector('.snel-seo-tax-tab.active').style.borderBottomColor = '#2271b1';

        // Language switching — all lang buttons.
        var allLangBtns = document.querySelectorAll('.snel-seo-tax-lang-btn');
        function syncLang() {
            document.querySelectorAll('.snel-seo-tax-lang-preview').forEach(function(p) { p.style.display = p.dataset.lang === currentLang ? '' : 'none'; });
            document.querySelectorAll('.snel-seo-tax-lang-custom').forEach(function(p) { p.style.display = p.dataset.lang === currentLang ? '' : 'none'; });
        }
        allLangBtns.forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                currentLang = this.dataset.lang;
                allLangBtns.forEach(function(b) {
                    b.style.background = b.dataset.lang === currentLang ? '#2271b1' : '#f0f0f1';
                    b.style.color = b.dataset.lang === currentLang ? '#fff' : '#50575e';
                    b.style.borderColor = b.dataset.lang === currentLang ? '#2271b1' : '#c3c4c7';
                });
                syncLang();
            });
        });

        // Char counter.
        document.querySelectorAll('.snel-seo-tax-desc').forEach(function(ta) {
            ta.addEventListener('input', function() {
                var counter = this.parentNode.querySelector('.snel-seo-tax-char');
                if (counter) counter.textContent = this.value.length;
            });
        });

        // Translate All.
        var translateBtn = document.getElementById('snel-seo-tax-translate-btn');
        var translateStatus = document.getElementById('snel-seo-tax-translate-status');
        if (translateBtn) {
            translateBtn.addEventListener('click', function(e) {
                e.preventDefault();
                var srcTitle = (document.querySelector('.snel-seo-tax-title[data-lang="' + defaultLang + '"]') || {}).value || '';
                var srcDesc = (document.querySelector('.snel-seo-tax-desc[data-lang="' + defaultLang + '"]') || {}).value || '';
                if (!srcTitle && !srcDesc) { translateStatus.textContent = 'Fill in default language first.'; return; }

                translateBtn.disabled = true;
                var otherLangs = currentLang === defaultLang ? languages.filter(function(l) { return l !== defaultLang; }) : [currentLang];
                var idx = 0;

                function next() {
                    if (idx >= otherLangs.length) {
                        translateStatus.textContent = 'All done \u2713';
                        translateBtn.disabled = false;
                        setTimeout(function() { translateStatus.textContent = ''; }, 2000);
                        return;
                    }
                    var lang = otherLangs[idx];
                    translateStatus.textContent = '\u2726 Translating ' + lang.toUpperCase() + '...';
                    var promises = [];
                    if (srcTitle) {
                        promises.push(fetch(restUrl + '/settings/translate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce }, body: JSON.stringify({ text: srcTitle, lang: lang, type: 'title' }) }).then(function(r) { return r.json(); }).then(function(d) { if (d.result) { var el = document.querySelector('.snel-seo-tax-title[data-lang="' + lang + '"]'); if (el) el.value = d.result; } }));
                    }
                    if (srcDesc) {
                        promises.push(fetch(restUrl + '/settings/translate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce }, body: JSON.stringify({ text: srcDesc, lang: lang, type: 'description' }) }).then(function(r) { return r.json(); }).then(function(d) { if (d.result) { var el = document.querySelector('.snel-seo-tax-desc[data-lang="' + lang + '"]'); if (el) el.value = d.result; } }));
                    }
                    Promise.all(promises).then(function() { idx++; next(); }).catch(function() { idx++; next(); });
                }
                next();
            });
        }
    })();
    </script>
    <?php
}

/**
 * Save taxonomy SEO meta box fields.
 */
function snel_seo_taxonomy_metabox_save( $term_id ) {
    if ( ! isset( $_POST['snel_seo_tax_nonce'] ) ) return;
    if ( ! wp_verify_nonce( $_POST['snel_seo_tax_nonce'], 'snel_seo_tax_metabox' ) ) return;
    if ( ! current_user_can( 'manage_categories' ) ) return;

    if ( isset( $_POST['snel_seo_tax_title'] ) && is_array( $_POST['snel_seo_tax_title'] ) ) {
        $titles = array();
        foreach ( $_POST['snel_seo_tax_title'] as $lang => $val ) {
            $titles[ sanitize_key( $lang ) ] = sanitize_text_field( wp_unslash( $val ) );
        }
        update_term_meta( $term_id, '_snel_seo_title', wp_json_encode( $titles ) );
    }

    if ( isset( $_POST['snel_seo_tax_desc'] ) && is_array( $_POST['snel_seo_tax_desc'] ) ) {
        $descs = array();
        foreach ( $_POST['snel_seo_tax_desc'] as $lang => $val ) {
            $descs[ sanitize_key( $lang ) ] = sanitize_text_field( wp_unslash( $val ) );
        }
        update_term_meta( $term_id, '_snel_seo_metadesc', wp_json_encode( $descs ) );
    }
}
