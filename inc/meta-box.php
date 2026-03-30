<?php
/**
 * Editor meta box — registration, script enqueue, post-meta REST endpoints.
 *
 * @package SnelSEO
 */

defined( 'ABSPATH' ) || exit;

/**
 * Register the SEO meta box.
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
            'default'
        );
    }
} );

// Load classic metabox file so save_post hook is always registered.
require_once SNEL_SEO_PLUGIN_DIR . 'inc/classic-metabox/classic-metabox.php';

function snel_seo_render_metabox( $post ) {
    // If the block editor is active, render the React root. Otherwise, render classic PHP meta box.
    if ( function_exists( 'use_block_editor_for_post' ) && use_block_editor_for_post( $post ) ) {
        echo '<div id="snel-seo-metabox-root"></div>';
    } else {
        snel_seo_classic_metabox_render( $post );
    }
}

/**
 * Enqueue editor React app.
 */
add_action( 'enqueue_block_editor_assets', function () {
    $asset_file = SNEL_SEO_PLUGIN_DIR . 'build/editor.asset.php';
    if ( ! file_exists( $asset_file ) ) return;

    $asset = require $asset_file;

    wp_enqueue_script( 'snel-seo-editor', SNEL_SEO_PLUGIN_URL . 'build/editor.js', $asset['dependencies'], $asset['version'], true );
    wp_enqueue_style( 'snel-seo-editor', SNEL_SEO_PLUGIN_URL . 'build/editor.css', array( 'wp-components' ), $asset['version'] );

    $settings  = get_option( SnelSeoConfig::$option_titles, array() );
    $languages = snel_seo_get_languages();

    wp_localize_script( 'snel-seo-editor', 'snelSeoEditor', array(
        'restUrl'      => rest_url( 'snel-seo/v1/post-meta' ),
        'generateUrl'  => rest_url( 'snel-seo/v1/generate' ),
        'renderUrl'    => rest_url( 'snel-seo/v1/render' ),
        'analyzeUrl'   => rest_url( 'snel-seo/v1/analyze' ),
        'suggestUrl'   => rest_url( 'snel-seo/v1/suggest-keyphrases' ),
        'nonce'        => wp_create_nonce( 'wp_rest' ),
        'languages'    => $languages,
        'defaultLang'  => snel_seo_get_default_lang(),
        'multilingual' => snel_seo_is_multilingual(),
        'settingsUrl'  => admin_url( 'admin.php?page=snel-seo' ),
        'settings'     => array(
            'website_name'     => isset( $settings['website_name'] ) ? $settings['website_name'] : get_bloginfo( 'name' ),
            'separator'        => isset( $settings['separator'] ) ? $settings['separator'] : 'sc-dash',
            'default_og_image' => isset( $settings['default_og_image'] ) ? $settings['default_og_image'] : '',
        ),
    ) );
} );

/**
 * Post meta REST endpoints.
 */
add_action( 'rest_api_init', function () {
    register_rest_route( SnelSeoConfig::$rest_namespace, '/post-meta/(?P<id>\d+)', array(
        array(
            'methods'  => 'GET',
            'callback' => function ( $request ) {
                $post_id   = (int) $request['id'];
                $seo_title = get_post_meta( $post_id, SnelSeoConfig::$meta_title, true );
                $metadesc  = get_post_meta( $post_id, SnelSeoConfig::$meta_desc, true );
                $focus_kw  = get_post_meta( $post_id, SnelSeoConfig::$meta_keyphrase, true );

                return rest_ensure_response( array(
                    'seo_title' => $seo_title ? json_decode( $seo_title, true ) : new \stdClass(),
                    'metadesc'  => $metadesc ? json_decode( $metadesc, true ) : new \stdClass(),
                    'focus_kw'  => $focus_kw ? json_decode( $focus_kw, true ) : new \stdClass(),
                ) );
            },
            'permission_callback' => function ( $request ) { return current_user_can( 'edit_post', $request['id'] ); },
        ),
        array(
            'methods'  => 'POST',
            'callback' => function ( $request ) {
                $post_id = (int) $request['id'];
                $params  = $request->get_json_params();

                if ( isset( $params['seo_title'] ) ) update_post_meta( $post_id, SnelSeoConfig::$meta_title, wp_json_encode( $params['seo_title'] ) );
                if ( isset( $params['metadesc'] ) ) update_post_meta( $post_id, SnelSeoConfig::$meta_desc, wp_json_encode( $params['metadesc'] ) );
                if ( isset( $params['focus_kw'] ) ) update_post_meta( $post_id, SnelSeoConfig::$meta_keyphrase, wp_json_encode( $params['focus_kw'] ) );

                return rest_ensure_response( array( 'success' => true ) );
            },
            'permission_callback' => function ( $request ) { return current_user_can( 'edit_post', $request['id'] ); },
        ),
    ) );
} );

/**
 * Register SEO meta keys.
 */
add_action( 'init', function () {
    $post_types = get_post_types( array( 'public' => true ) );
    $meta_keys  = array( SnelSeoConfig::$meta_title, SnelSeoConfig::$meta_desc, SnelSeoConfig::$meta_keyphrase );

    foreach ( $post_types as $post_type ) {
        foreach ( $meta_keys as $key ) {
            register_post_meta( $post_type, $key, array(
                'show_in_rest'  => true,
                'single'        => true,
                'type'          => 'string',
                'auth_callback' => function () { return current_user_can( 'edit_posts' ); },
            ) );
        }
    }
} );
