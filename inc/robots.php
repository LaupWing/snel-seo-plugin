<?php
/**
 * Robots.txt — filter override + REST endpoints for editor.
 *
 * @package SnelSEO
 */

defined( 'ABSPATH' ) || exit;

add_filter( 'robots_txt', function ( $output ) {
    $custom = get_option( 'snel_seo_robots_txt', '' );
    return ! empty( $custom ) ? $custom : $output;
} );

add_action( 'rest_api_init', function () {
    register_rest_route( 'snel-seo/v1', '/robots', array(
        array(
            'methods'             => 'GET',
            'callback'            => function () {
                $custom  = get_option( 'snel_seo_robots_txt', '' );
                $default = "User-agent: *\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\n\nSitemap: " . home_url( '/wp-sitemap.xml' );
                return rest_ensure_response( array(
                    'content'   => $custom ?: $default,
                    'is_custom' => ! empty( $custom ),
                ) );
            },
            'permission_callback' => function () { return current_user_can( 'manage_options' ); },
        ),
        array(
            'methods'             => 'POST',
            'callback'            => function ( $request ) {
                $params = $request->get_json_params();
                update_option( 'snel_seo_robots_txt', sanitize_textarea_field( $params['content'] ?? '' ) );
                return rest_ensure_response( array( 'success' => true ) );
            },
            'permission_callback' => function () { return current_user_can( 'manage_options' ); },
        ),
        array(
            'methods'             => 'DELETE',
            'callback'            => function () {
                delete_option( 'snel_seo_robots_txt' );
                return rest_ensure_response( array( 'success' => true ) );
            },
            'permission_callback' => function () { return current_user_can( 'manage_options' ); },
        ),
    ) );
} );
