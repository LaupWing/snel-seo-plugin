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
    add_menu_page( __( 'Snel SEO', 'snel-seo' ), __( 'Snel SEO', 'snel-seo' ), 'manage_options', 'snel-seo', function () { snel_seo_render_page( 'dashboard' ); }, 'dashicons-search', 30 );
    add_submenu_page( 'snel-seo', __( 'Dashboard', 'snel-seo' ), __( 'Dashboard', 'snel-seo' ), 'manage_options', 'snel-seo', function () { snel_seo_render_page( 'dashboard' ); } );
    add_submenu_page( 'snel-seo', __( 'Settings', 'snel-seo' ), __( 'Settings', 'snel-seo' ), 'manage_options', 'snel-seo-settings', function () { snel_seo_render_page( 'settings' ); } );
    add_submenu_page( 'snel-seo', __( 'Redirects', 'snel-seo' ), __( 'Redirects', 'snel-seo' ), 'manage_options', 'snel-seo-redirects', function () { snel_seo_render_page( 'redirects' ); } );
    add_submenu_page( 'snel-seo', __( 'Tools', 'snel-seo' ), __( 'Tools', 'snel-seo' ), 'manage_options', 'snel-seo-tools', function () { snel_seo_render_page( 'tools' ); } );
} );

function snel_seo_render_page( $page ) {
    printf( '<div id="snel-seo-root" class="wrap" data-page="%s"></div>', esc_attr( $page ) );
}

/**
 * Enqueue admin React app on Snel SEO pages.
 */
add_action( 'admin_enqueue_scripts', function ( $hook ) {
    $seo_pages = array( 'toplevel_page_snel-seo', 'snel-seo_page_snel-seo-settings', 'snel-seo_page_snel-seo-redirects', 'snel-seo_page_snel-seo-tools' );
    if ( ! in_array( $hook, $seo_pages, true ) ) return;

    $asset_file = SNEL_SEO_PLUGIN_DIR . 'build/index.asset.php';
    if ( ! file_exists( $asset_file ) ) return;

    $asset = require $asset_file;

    wp_enqueue_script( 'snel-seo-admin', SNEL_SEO_PLUGIN_URL . 'build/index.js', $asset['dependencies'], $asset['version'], true );
    wp_enqueue_style( 'snel-seo-admin', SNEL_SEO_PLUGIN_URL . 'build/index.css', array( 'wp-components' ), $asset['version'] );
    wp_enqueue_media();

    $settings = get_option( 'wpseo_titles', array() );

    wp_localize_script( 'snel-seo-admin', 'snelSeo', array(
        'restUrl'  => rest_url( 'snel-seo/v1' ),
        'nonce'    => wp_create_nonce( 'wp_rest' ),
        'version'  => SNEL_SEO_VERSION,
        'settings' => array(
            'website_name'     => isset( $settings['website_name'] ) ? $settings['website_name'] : get_bloginfo( 'name' ),
            'separator'        => isset( $settings['separator'] ) ? $settings['separator'] : 'sc-dash',
            'title_home'       => isset( $settings['title-home-wpseo'] ) ? $settings['title-home-wpseo'] : '%%sitename%% %%separator%% %%sitedesc%%',
            'metadesc_home'    => isset( $settings['metadesc-home-wpseo'] ) ? $settings['metadesc-home-wpseo'] : '',
            'title_post'       => isset( $settings['title-post'] ) ? $settings['title-post'] : '%%title%% %%separator%% %%sitename%%',
            'metadesc_post'    => isset( $settings['metadesc-post'] ) ? $settings['metadesc-post'] : '',
            'title_page'       => isset( $settings['title-page'] ) ? $settings['title-page'] : '%%title%% %%separator%% %%sitename%%',
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
 * Settings save endpoint.
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'snel-seo/v1', '/settings', array(
        'methods'             => 'POST',
        'callback'            => 'snel_seo_save_settings',
        'permission_callback' => function () { return current_user_can( 'manage_options' ); },
    ) );
} );

function snel_seo_save_settings( WP_REST_Request $request ) {
    $params   = $request->get_json_params();
    $settings = get_option( 'wpseo_titles', array() );

    $allowed_keys = array(
        'website_name'  => 'website_name', 'separator' => 'separator',
        'title_home'    => 'title-home-wpseo', 'metadesc_home' => 'metadesc-home-wpseo',
        'title_post'    => 'title-post', 'metadesc_post' => 'metadesc-post',
        'title_page'    => 'title-page', 'metadesc_page' => 'metadesc-page',
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
