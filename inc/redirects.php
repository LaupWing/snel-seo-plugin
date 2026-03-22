<?php
/**
 * Redirects — database table, template_redirect hook, REST CRUD + bulk import.
 *
 * @package SnelSEO
 */

defined( 'ABSPATH' ) || exit;

/**
 * Create redirects table on plugin activation.
 */
function snel_seo_create_redirects_table() {
    global $wpdb;
    $table   = $wpdb->prefix . 'snel_seo_redirects';
    $charset = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE $table (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        source_url varchar(500) NOT NULL,
        target_url varchar(500) NOT NULL,
        type smallint(3) NOT NULL DEFAULT 301,
        hits bigint(20) unsigned NOT NULL DEFAULT 0,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY source_url (source_url(191))
    ) $charset;";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta( $sql );
}

// Create table on admin init if it doesn't exist.
add_action( 'admin_init', function () {
    global $wpdb;
    $table = $wpdb->prefix . 'snel_seo_redirects';
    if ( $wpdb->get_var( "SHOW TABLES LIKE '$table'" ) !== $table ) {
        snel_seo_create_redirects_table();
    }
} );

/**
 * Process redirects on frontend requests.
 */
add_action( 'template_redirect', function () {
    global $wpdb;
    $table = $wpdb->prefix . 'snel_seo_redirects';

    $request_path = '/' . trim( wp_parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH ), '/' );
    if ( empty( $request_path ) || $request_path === '/' ) return;

    $row = $wpdb->get_row( $wpdb->prepare(
        "SELECT id, target_url, type FROM $table WHERE source_url = %s LIMIT 1",
        $request_path
    ) );

    if ( $row ) {
        $wpdb->query( $wpdb->prepare( "UPDATE $table SET hits = hits + 1 WHERE id = %d", $row->id ) );
        $target = $row->target_url;
        if ( strpos( $target, 'http' ) !== 0 ) {
            $target = home_url( $target );
        }
        wp_redirect( $target, (int) $row->type );
        exit;
    }
} );

/**
 * REST endpoints for redirects CRUD.
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'snel-seo/v1', '/redirects', array(
        array(
            'methods'             => 'GET',
            'callback'            => function () {
                global $wpdb;
                $table   = $wpdb->prefix . 'snel_seo_redirects';
                $results = $wpdb->get_results( "SELECT * FROM $table ORDER BY created_at DESC", ARRAY_A );
                return rest_ensure_response( $results ?: array() );
            },
            'permission_callback' => function () {
                return current_user_can( 'manage_options' );
            },
        ),
        array(
            'methods'             => 'POST',
            'callback'            => function ( $request ) {
                global $wpdb;
                $table  = $wpdb->prefix . 'snel_seo_redirects';
                $params = $request->get_json_params();

                $source = isset( $params['source_url'] ) ? sanitize_text_field( $params['source_url'] ) : '';
                $target = isset( $params['target_url'] ) ? sanitize_text_field( $params['target_url'] ) : '';
                $type   = isset( $params['type'] ) ? (int) $params['type'] : 301;

                if ( empty( $source ) || empty( $target ) ) {
                    return new WP_Error( 'missing_fields', 'Source and target URLs are required.', array( 'status' => 400 ) );
                }

                $source = '/' . trim( wp_parse_url( $source, PHP_URL_PATH ) ?: $source, '/' );
                $target = '/' . trim( wp_parse_url( $target, PHP_URL_PATH ) ?: $target, '/' );

                $wpdb->insert( $table, array(
                    'source_url' => $source,
                    'target_url' => $target,
                    'type'       => in_array( $type, array( 301, 302 ), true ) ? $type : 301,
                ) );

                return rest_ensure_response( array( 'id' => $wpdb->insert_id, 'success' => true ) );
            },
            'permission_callback' => function () {
                return current_user_can( 'manage_options' );
            },
        ),
    ) );

    register_rest_route( 'snel-seo/v1', '/redirects/(?P<id>\d+)', array(
        array(
            'methods'             => 'PUT',
            'callback'            => function ( $request ) {
                global $wpdb;
                $table  = $wpdb->prefix . 'snel_seo_redirects';
                $params = $request->get_json_params();
                $id     = (int) $request['id'];

                $update = array();
                if ( isset( $params['source_url'] ) ) {
                    $update['source_url'] = '/' . trim( wp_parse_url( sanitize_text_field( $params['source_url'] ), PHP_URL_PATH ) ?: $params['source_url'], '/' );
                }
                if ( isset( $params['target_url'] ) ) {
                    $update['target_url'] = '/' . trim( wp_parse_url( sanitize_text_field( $params['target_url'] ), PHP_URL_PATH ) ?: $params['target_url'], '/' );
                }
                if ( isset( $params['type'] ) ) {
                    $type = (int) $params['type'];
                    $update['type'] = in_array( $type, array( 301, 302 ), true ) ? $type : 301;
                }

                if ( ! empty( $update ) ) {
                    $wpdb->update( $table, $update, array( 'id' => $id ) );
                }

                return rest_ensure_response( array( 'success' => true ) );
            },
            'permission_callback' => function () {
                return current_user_can( 'manage_options' );
            },
        ),
        array(
            'methods'             => 'DELETE',
            'callback'            => function ( $request ) {
                global $wpdb;
                $table = $wpdb->prefix . 'snel_seo_redirects';
                $wpdb->delete( $table, array( 'id' => (int) $request['id'] ) );
                return rest_ensure_response( array( 'success' => true ) );
            },
            'permission_callback' => function () {
                return current_user_can( 'manage_options' );
            },
        ),
    ) );

    // Bulk import.
    register_rest_route( 'snel-seo/v1', '/redirects/import', array(
        'methods'             => 'POST',
        'callback'            => function ( $request ) {
            global $wpdb;
            $table    = $wpdb->prefix . 'snel_seo_redirects';
            $mappings = $request->get_json_params();

            if ( ! is_array( $mappings ) ) {
                return new WP_Error( 'invalid_format', 'Expected a JSON array.', array( 'status' => 400 ) );
            }

            $imported = 0;
            $skipped  = 0;

            foreach ( $mappings as $item ) {
                $old = isset( $item['old_url'] ) ? $item['old_url'] : '';
                $new = isset( $item['new_url'] ) ? $item['new_url'] : '';

                if ( empty( $old ) || empty( $new ) ) {
                    $skipped++;
                    continue;
                }

                $source = '/' . trim( wp_parse_url( $old, PHP_URL_PATH ) ?: $old, '/' );
                $target = '/' . trim( wp_parse_url( $new, PHP_URL_PATH ) ?: $new, '/' );

                $exists = $wpdb->get_var( $wpdb->prepare(
                    "SELECT id FROM $table WHERE source_url = %s LIMIT 1",
                    $source
                ) );
                if ( $exists ) {
                    $skipped++;
                    continue;
                }

                $wpdb->insert( $table, array(
                    'source_url' => $source,
                    'target_url' => $target,
                    'type'       => 301,
                ) );
                $imported++;
            }

            return rest_ensure_response( array(
                'success'  => true,
                'imported' => $imported,
                'skipped'  => $skipped,
                'total'    => count( $mappings ),
            ) );
        },
        'permission_callback' => function () {
            return current_user_can( 'manage_options' );
        },
    ) );

    // Bulk delete all.
    register_rest_route( 'snel-seo/v1', '/redirects/all', array(
        'methods'             => 'DELETE',
        'callback'            => function () {
            global $wpdb;
            $table = $wpdb->prefix . 'snel_seo_redirects';
            $wpdb->query( "TRUNCATE TABLE $table" );
            return rest_ensure_response( array( 'success' => true ) );
        },
        'permission_callback' => function () {
            return current_user_can( 'manage_options' );
        },
    ) );
} );
