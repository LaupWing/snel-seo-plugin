<?php
/**
 * XML Sitemap — custom sitemap with settings, or WordPress default.
 *
 * @package SnelSEO
 */

defined( 'ABSPATH' ) || exit;

/**
 * Get sitemap settings.
 */
function snel_seo_sitemap_settings() {
    return wp_parse_args( get_option( 'snel_seo_sitemap', array() ), array(
        'enabled'          => false,   // false = use WP default, true = use custom
        'include_pages'    => true,
        'include_posts'    => true,
        'include_products' => true,
        'excluded_ids'     => array(),
    ) );
}

/**
 * Disable WordPress default sitemap when custom is enabled.
 */
add_filter( 'wp_sitemaps_enabled', function ( $is_enabled ) {
    $settings = snel_seo_sitemap_settings();
    return $settings['enabled'] ? false : $is_enabled;
} );

/**
 * Register custom sitemap rewrite + template redirect.
 */
add_action( 'init', function () {
    add_rewrite_rule( '^sitemap\.xml$', 'index.php?snel_sitemap=index', 'top' );
    add_rewrite_rule( '^sitemap-([a-z]+)\.xml$', 'index.php?snel_sitemap=$matches[1]', 'top' );
} );

add_filter( 'query_vars', function ( $vars ) {
    $vars[] = 'snel_sitemap';
    return $vars;
} );

add_action( 'template_redirect', function () {
    $sitemap_type = get_query_var( 'snel_sitemap' );
    if ( ! $sitemap_type ) return;

    $settings = snel_seo_sitemap_settings();
    if ( ! $settings['enabled'] ) return;

    header( 'Content-Type: application/xml; charset=UTF-8' );
    header( 'X-Robots-Tag: noindex' );

    if ( 'index' === $sitemap_type ) {
        echo snel_seo_render_sitemap_index( $settings );
    } else {
        echo snel_seo_render_sitemap( $sitemap_type, $settings );
    }

    exit;
} );

/**
 * Render the sitemap index (links to sub-sitemaps).
 */
function snel_seo_render_sitemap_index( $settings ) {
    $sitemaps = array();

    if ( $settings['include_pages'] ) {
        $sitemaps[] = home_url( '/sitemap-pages.xml' );
    }
    if ( $settings['include_posts'] ) {
        $count = wp_count_posts( 'post' );
        if ( $count->publish > 0 ) {
            $sitemaps[] = home_url( '/sitemap-posts.xml' );
        }
    }
    if ( $settings['include_products'] && post_type_exists( 'product' ) ) {
        $count = wp_count_posts( 'product' );
        if ( $count->publish > 0 ) {
            $sitemaps[] = home_url( '/sitemap-products.xml' );
        }
    }

    $xml  = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

    foreach ( $sitemaps as $loc ) {
        $xml .= "  <sitemap>\n";
        $xml .= '    <loc>' . esc_url( $loc ) . "</loc>\n";
        $xml .= "  </sitemap>\n";
    }

    $xml .= '</sitemapindex>';
    return $xml;
}

/**
 * Render a sub-sitemap for a given type.
 */
function snel_seo_render_sitemap( $type, $settings ) {
    $post_type = 'pages' === $type ? 'page' : ( 'posts' === $type ? 'post' : $type );

    // Validate type is enabled.
    if ( 'page' === $post_type && ! $settings['include_pages'] ) return '';
    if ( 'post' === $post_type && ! $settings['include_posts'] ) return '';
    if ( 'products' === $type && ! $settings['include_products'] ) {
        return '';
    }
    if ( 'products' === $type ) {
        $post_type = 'product';
    }

    $excluded = array_map( 'intval', $settings['excluded_ids'] );

    $args = array(
        'post_type'      => $post_type,
        'post_status'    => 'publish',
        'posts_per_page' => 2000,
        'orderby'        => 'modified',
        'order'          => 'DESC',
        'fields'         => 'ids',
    );

    if ( ! empty( $excluded ) ) {
        $args['post__not_in'] = $excluded;
    }

    $ids = get_posts( $args );

    $xml  = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

    foreach ( $ids as $post_id ) {
        $url      = get_permalink( $post_id );
        $modified = get_post_modified_time( 'Y-m-d\TH:i:sP', true, $post_id );

        $xml .= "  <url>\n";
        $xml .= '    <loc>' . esc_url( $url ) . "</loc>\n";
        $xml .= '    <lastmod>' . esc_html( $modified ) . "</lastmod>\n";
        $xml .= "  </url>\n";
    }

    $xml .= '</urlset>';
    return $xml;
}

/**
 * REST API endpoints for sitemap settings + preview.
 */
add_action( 'rest_api_init', function () {
    // Get settings.
    register_rest_route( 'snel-seo/v1', '/sitemap/settings', array(
        array(
            'methods'             => 'GET',
            'callback'            => function () {
                return rest_ensure_response( snel_seo_sitemap_settings() );
            },
            'permission_callback' => function () {
                return current_user_can( 'manage_options' );
            },
        ),
        array(
            'methods'             => 'POST',
            'callback'            => function ( $request ) {
                $params   = $request->get_json_params();
                $settings = snel_seo_sitemap_settings();

                if ( isset( $params['enabled'] ) ) {
                    $settings['enabled'] = (bool) $params['enabled'];
                }
                if ( isset( $params['include_pages'] ) ) {
                    $settings['include_pages'] = (bool) $params['include_pages'];
                }
                if ( isset( $params['include_posts'] ) ) {
                    $settings['include_posts'] = (bool) $params['include_posts'];
                }
                if ( isset( $params['include_products'] ) ) {
                    $settings['include_products'] = (bool) $params['include_products'];
                }
                if ( isset( $params['excluded_ids'] ) && is_array( $params['excluded_ids'] ) ) {
                    $settings['excluded_ids'] = array_map( 'intval', $params['excluded_ids'] );
                }

                update_option( 'snel_seo_sitemap', $settings );

                // Flush rewrite rules when toggling custom sitemap.
                flush_rewrite_rules();

                return rest_ensure_response( array( 'success' => true, 'settings' => $settings ) );
            },
            'permission_callback' => function () {
                return current_user_can( 'manage_options' );
            },
        ),
    ) );

    // Preview — return URLs that would be in the sitemap.
    register_rest_route( 'snel-seo/v1', '/sitemap/preview', array(
        'methods'  => 'GET',
        'callback' => function () {
            $settings = snel_seo_sitemap_settings();
            $excluded = array_map( 'intval', $settings['excluded_ids'] );
            $entries  = array();

            $types = array();
            if ( $settings['include_pages'] ) $types[] = 'page';
            if ( $settings['include_posts'] ) $types[] = 'post';
            if ( $settings['include_products'] && post_type_exists( 'product' ) ) $types[] = 'product';

            foreach ( $types as $post_type ) {
                $args = array(
                    'post_type'      => $post_type,
                    'post_status'    => 'publish',
                    'posts_per_page' => 100,
                    'orderby'        => 'modified',
                    'order'          => 'DESC',
                );

                if ( ! empty( $excluded ) ) {
                    $args['post__not_in'] = $excluded;
                }

                $posts = get_posts( $args );

                foreach ( $posts as $post ) {
                    $entries[] = array(
                        'id'       => $post->ID,
                        'title'    => $post->post_title,
                        'url'      => get_permalink( $post->ID ),
                        'type'     => $post_type,
                        'modified' => get_post_modified_time( 'Y-m-d', true, $post->ID ),
                        'excluded' => in_array( $post->ID, $excluded, true ),
                    );
                }
            }

            // Also return excluded posts separately so they show in the UI.
            if ( ! empty( $excluded ) ) {
                $excluded_posts = get_posts( array(
                    'post_type'      => array( 'page', 'post', 'product' ),
                    'post__in'       => $excluded,
                    'post_status'    => 'publish',
                    'posts_per_page' => 100,
                ) );

                foreach ( $excluded_posts as $post ) {
                    $entries[] = array(
                        'id'       => $post->ID,
                        'title'    => $post->post_title,
                        'url'      => get_permalink( $post->ID ),
                        'type'     => $post->post_type,
                        'modified' => get_post_modified_time( 'Y-m-d', true, $post->ID ),
                        'excluded' => true,
                    );
                }
            }

            return rest_ensure_response( $entries );
        },
        'permission_callback' => function () {
            return current_user_can( 'manage_options' );
        },
    ) );
} );
