<?php
/**
 * SEO Scanner — bulk page analysis with AI.
 *
 * Renders pages, extracts SEO elements, sends to AI for analysis.
 * Results stored in wp_snel_seo_scans table.
 *
 * @package SnelSEO
 */

defined( 'ABSPATH' ) || exit;

/**
 * Create the scans table on plugin activation.
 */
function snel_seo_scanner_create_table() {
    global $wpdb;
    $table   = $wpdb->prefix . 'snel_seo_scans';
    $charset = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE IF NOT EXISTS $table (
        id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        post_id bigint(20) UNSIGNED NOT NULL,
        lang varchar(5) NOT NULL DEFAULT 'nl',
        url text NOT NULL,
        content_hash varchar(32) DEFAULT NULL,
        checks longtext,
        score int(3) DEFAULT NULL,
        ai_summary text,
        scanned_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY post_lang (post_id, lang),
        KEY scanned_at (scanned_at)
    ) $charset;";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta( $sql );
}
register_activation_hook( SNEL_SEO_PLUGIN_DIR . 'snel-seo.php', 'snel_seo_scanner_create_table' );

// Run dbDelta on admin_init to create or update the table schema.
add_action( 'admin_init', function () {
    $version_key = 'snel_seo_scans_db_version';
    $current     = '1.1'; // Bump when schema changes.
    if ( get_option( $version_key ) !== $current ) {
        snel_seo_scanner_create_table();
        update_option( $version_key, $current );
    }
} );

/**
 * Extract SEO elements from rendered HTML.
 */
function snel_seo_extract_from_html( $html ) {
    $data = array(
        'title'     => '',
        'meta_desc' => '',
        'h1'        => array(),
        'h2'        => array(),
        'body_text' => '',
    );

    // Title tag.
    if ( preg_match( '/<title[^>]*>(.+?)<\/title>/is', $html, $m ) ) {
        $data['title'] = trim( html_entity_decode( wp_strip_all_tags( $m[1] ), ENT_QUOTES, 'UTF-8' ) );
    }

    // Meta description.
    if ( preg_match( '/<meta\s+name=["\']description["\']\s+content=["\']([^"\']*)["\'][^>]*>/is', $html, $m ) ) {
        $data['meta_desc'] = trim( html_entity_decode( $m[1], ENT_QUOTES, 'UTF-8' ) );
    }

    // H1 tags.
    if ( preg_match_all( '/<h1[^>]*>(.+?)<\/h1>/is', $html, $m ) ) {
        foreach ( $m[1] as $inner ) {
            $clean = trim( html_entity_decode( wp_strip_all_tags( $inner ), ENT_QUOTES, 'UTF-8' ) );
            if ( $clean ) $data['h1'][] = $clean;
        }
    }

    // H2 tags.
    if ( preg_match_all( '/<h2[^>]*>(.+?)<\/h2>/is', $html, $m ) ) {
        foreach ( $m[1] as $inner ) {
            $clean = trim( html_entity_decode( wp_strip_all_tags( $inner ), ENT_QUOTES, 'UTF-8' ) );
            if ( $clean ) $data['h2'][] = $clean;
        }
    }

    // Body text (first 500 chars of visible content).
    if ( preg_match( '/<body[^>]*>(.*)<\/body>/is', $html, $m ) ) {
        $text = wp_strip_all_tags( $m[1] );
        $text = preg_replace( '/\s+/', ' ', trim( $text ) );
        $data['body_text'] = mb_substr( $text, 0, 500 );
    }

    return $data;
}

/**
 * Analyze a single page with AI.
 */
function snel_seo_scanner_analyze( $url, $lang, $extracted ) {
    $api_key = function_exists( 'snelstack_get_openai_key' ) ? snelstack_get_openai_key() : '';
    $model   = function_exists( 'snelstack_get_openai_model' ) ? snelstack_get_openai_model() : 'gpt-4o-mini';

    if ( ! $api_key ) {
        return new WP_Error( 'no_api_key', 'OpenAI API key not configured.' );
    }

    $prompt = sprintf(
        "Analyze this web page's SEO. The page URL is: %s\n" .
        "The expected language for this page is: %s\n\n" .
        "Extracted SEO elements:\n" .
        "- Title: %s\n" .
        "- Meta description: %s\n" .
        "- H1 tags: %s\n" .
        "- H2 tags: %s\n" .
        "- Body text (first 500 chars): %s\n\n" .
        "Perform these 5 checks:\n" .
        "1. title — Does the title exist and is it in the correct language (%s)?\n" .
        "2. meta_desc — Does the meta description exist and is it in the correct language?\n" .
        "3. h1 — Does exactly one H1 exist and is it in the correct language?\n" .
        "4. content_lang — Is the body content in the correct language?\n" .
        "5. desc_relevance — Is the meta description relevant to the actual page content?\n\n" .
        "Return your analysis as JSON.",
        $url,
        $lang,
        $extracted['title'] ?: '(empty)',
        $extracted['meta_desc'] ?: '(empty)',
        ! empty( $extracted['h1'] ) ? implode( ', ', $extracted['h1'] ) : '(none)',
        ! empty( $extracted['h2'] ) ? implode( ', ', array_slice( $extracted['h2'], 0, 5 ) ) : '(none)',
        $extracted['body_text'] ?: '(empty)',
        $lang
    );

    $response = wp_remote_post( 'https://api.openai.com/v1/chat/completions', array(
        'timeout' => 30,
        'headers' => array(
            'Content-Type'  => 'application/json',
            'Authorization' => 'Bearer ' . $api_key,
        ),
        'body'    => wp_json_encode( array(
            'model'           => $model,
            'messages'        => array(
                array( 'role' => 'system', 'content' => 'You are an SEO analyst. Analyze web pages and return structured JSON results. Be concise in your messages — max 1 sentence per check.' ),
                array( 'role' => 'user', 'content' => $prompt ),
            ),
            'response_format' => array(
                'type'        => 'json_schema',
                'json_schema' => array(
                    'name'   => 'seo_scan',
                    'strict' => true,
                    'schema' => array(
                        'type'                 => 'object',
                        'required'             => array( 'checks', 'score', 'summary' ),
                        'additionalProperties' => false,
                        'properties'           => array(
                            'checks'  => array(
                                'type'                 => 'object',
                                'required'             => array( 'title', 'meta_desc', 'h1', 'content_lang', 'desc_relevance' ),
                                'additionalProperties' => false,
                                'properties'           => array(
                                    'title'          => snel_seo_check_schema(),
                                    'meta_desc'      => snel_seo_check_schema(),
                                    'h1'             => snel_seo_check_schema(),
                                    'content_lang'   => snel_seo_check_schema(),
                                    'desc_relevance' => snel_seo_check_schema(),
                                ),
                            ),
                            'score'   => array( 'type' => 'integer' ),
                            'summary' => array( 'type' => 'string' ),
                        ),
                    ),
                ),
            ),
            'temperature'     => 0.1,
            'max_tokens'      => 500,
        ) ),
    ) );

    if ( is_wp_error( $response ) ) {
        return $response;
    }

    $body = json_decode( wp_remote_retrieve_body( $response ), true );
    $content = $body['choices'][0]['message']['content'] ?? '';

    return json_decode( $content, true );
}

/**
 * JSON schema for a single check result.
 */
function snel_seo_check_schema() {
    return array(
        'type'                 => 'object',
        'required'             => array( 'status', 'message' ),
        'additionalProperties' => false,
        'properties'           => array(
            'status'  => array( 'type' => 'string', 'enum' => array( 'ok', 'warning', 'error' ) ),
            'message' => array( 'type' => 'string' ),
        ),
    );
}

/**
 * REST endpoint: scan a batch of pages.
 */
add_action( 'rest_api_init', function () {
    // Scan a batch of post IDs.
    register_rest_route( SnelSeoConfig::$rest_namespace, '/scanner/batch', array(
        'methods'             => 'POST',
        'callback'            => 'snel_seo_scanner_batch',
        'permission_callback' => function () { return current_user_can( 'manage_options' ); },
    ) );

    // Get scan results (paginated).
    register_rest_route( SnelSeoConfig::$rest_namespace, '/scanner/results', array(
        'methods'             => 'GET',
        'callback'            => 'snel_seo_scanner_results',
        'permission_callback' => function () { return current_user_can( 'manage_options' ); },
    ) );

    // Get scan summary (counts per status).
    register_rest_route( SnelSeoConfig::$rest_namespace, '/scanner/summary', array(
        'methods'             => 'GET',
        'callback'            => 'snel_seo_scanner_summary',
        'permission_callback' => function () { return current_user_can( 'manage_options' ); },
    ) );

    // Get scannable post IDs (for batch queue).
    register_rest_route( SnelSeoConfig::$rest_namespace, '/scanner/queue', array(
        'methods'             => 'GET',
        'callback'            => 'snel_seo_scanner_queue',
        'permission_callback' => function () { return current_user_can( 'manage_options' ); },
    ) );
} );

/**
 * Get all scannable post IDs.
 */
function snel_seo_scanner_queue( WP_REST_Request $request ) {
    $post_types = get_post_types( array( 'public' => true ), 'names' );
    unset( $post_types['attachment'] );

    $posts = get_posts( array(
        'post_type'      => array_values( $post_types ),
        'post_status'    => 'publish',
        'posts_per_page' => -1,
        'fields'         => 'ids',
    ) );

    // Get supported languages.
    $languages = array( snel_seo_get_default_lang() );
    if ( has_filter( 'snel_seo_languages' ) ) {
        $all_langs = apply_filters( 'snel_seo_languages', array() );
        $languages = wp_list_pluck( $all_langs, 'code' );
    }

    return rest_ensure_response( array(
        'post_ids'  => $posts,
        'languages' => $languages,
        'total'     => count( $posts ) * count( $languages ),
    ) );
}

/**
 * Scan a batch of pages.
 */
function snel_seo_scanner_batch( WP_REST_Request $request ) {
    global $wpdb;
    $table = $wpdb->prefix . 'snel_seo_scans';

    $params   = $request->get_json_params();
    $post_ids = $params['post_ids'] ?? array();
    $langs    = $params['languages'] ?? array( snel_seo_get_default_lang() );

    if ( empty( $post_ids ) ) {
        return new WP_Error( 'no_posts', 'No post IDs provided.', array( 'status' => 400 ) );
    }

    $results   = array();
    $site_url  = home_url();

    foreach ( $post_ids as $post_id ) {
        $post = get_post( (int) $post_id );
        if ( ! $post ) continue;

        $permalink = get_permalink( $post_id );

        foreach ( $langs as $lang ) {
            // Build the language-specific URL.
            $default_lang = snel_seo_get_default_lang();
            if ( $lang === $default_lang ) {
                $url = $permalink;
            } else {
                // Add language prefix.
                $path = wp_parse_url( $permalink, PHP_URL_PATH );
                $url  = $site_url . '/' . $lang . $path;
            }

            // Fetch the rendered page.
            $response = wp_remote_get( $url, array(
                'timeout'   => 15,
                'sslverify' => false,
            ) );

            if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) !== 200 ) {
                $results[] = array(
                    'post_id' => $post_id,
                    'lang'    => $lang,
                    'url'     => $url,
                    'error'   => is_wp_error( $response ) ? $response->get_error_message() : 'HTTP ' . wp_remote_retrieve_response_code( $response ),
                );
                continue;
            }

            $html      = wp_remote_retrieve_body( $response );
            $extracted = snel_seo_extract_from_html( $html );

            // Hash the extracted content to detect changes.
            $hash = md5( wp_json_encode( $extracted ) );

            // Check if content hasn't changed since last scan.
            $existing = $wpdb->get_row( $wpdb->prepare(
                "SELECT content_hash, checks, score, ai_summary FROM $table WHERE post_id = %d AND lang = %s",
                $post_id, $lang
            ) );

            if ( $existing && $existing->content_hash === $hash ) {
                // Content unchanged — skip AI, keep existing result.
                $results[] = array(
                    'post_id' => $post_id,
                    'lang'    => $lang,
                    'url'     => $url,
                    'score'   => (int) $existing->score,
                    'summary' => $existing->ai_summary,
                    'skipped' => true,
                );
                continue;
            }

            // Content changed or first scan — call AI.
            $analysis = snel_seo_scanner_analyze( $url, $lang, $extracted );

            if ( is_wp_error( $analysis ) ) {
                $results[] = array(
                    'post_id' => $post_id,
                    'lang'    => $lang,
                    'url'     => $url,
                    'error'   => $analysis->get_error_message(),
                );
                continue;
            }

            // Delete previous scan for this post+lang.
            $wpdb->delete( $table, array( 'post_id' => $post_id, 'lang' => $lang ) );

            // Insert new result.
            $wpdb->insert( $table, array(
                'post_id'      => $post_id,
                'lang'         => $lang,
                'url'          => $url,
                'content_hash' => $hash,
                'checks'       => wp_json_encode( $analysis['checks'] ?? array() ),
                'score'        => (int) ( $analysis['score'] ?? 0 ),
                'ai_summary'   => $analysis['summary'] ?? '',
                'scanned_at'   => current_time( 'mysql' ),
            ) );

            $results[] = array(
                'post_id' => $post_id,
                'lang'    => $lang,
                'url'     => $url,
                'score'   => $analysis['score'] ?? 0,
                'summary' => $analysis['summary'] ?? '',
            );
        }
    }

    return rest_ensure_response( array( 'results' => $results ) );
}

/**
 * Get scan results (paginated, filterable).
 */
function snel_seo_scanner_results( WP_REST_Request $request ) {
    global $wpdb;
    $table = $wpdb->prefix . 'snel_seo_scans';

    $page     = max( 1, (int) $request->get_param( 'page' ) ?: 1 );
    $per_page = min( 100, max( 10, (int) $request->get_param( 'per_page' ) ?: 20 ) );
    $lang     = sanitize_text_field( $request->get_param( 'lang' ) ?: '' );
    $status   = sanitize_text_field( $request->get_param( 'status' ) ?: '' );
    $offset   = ( $page - 1 ) * $per_page;

    $where = '1=1';
    $args  = array();

    if ( $lang ) {
        $where .= ' AND lang = %s';
        $args[] = $lang;
    }

    if ( $status === 'issues' ) {
        $where .= ' AND score < 80';
    } elseif ( $status === 'good' ) {
        $where .= ' AND score >= 80';
    }

    $total = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM $table WHERE $where", ...$args ) );

    $query_args = array_merge( $args, array( $per_page, $offset ) );
    $rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT * FROM $table WHERE $where ORDER BY score ASC, scanned_at DESC LIMIT %d OFFSET %d",
        ...$query_args
    ) );

    // Decode checks JSON.
    foreach ( $rows as &$row ) {
        $row->checks = json_decode( $row->checks, true );
        $row->post_title = get_the_title( $row->post_id );
    }

    return rest_ensure_response( array(
        'results'  => $rows,
        'total'    => $total,
        'page'     => $page,
        'per_page' => $per_page,
        'pages'    => ceil( $total / $per_page ),
    ) );
}

/**
 * Get scan summary.
 */
function snel_seo_scanner_summary( WP_REST_Request $request ) {
    global $wpdb;
    $table = $wpdb->prefix . 'snel_seo_scans';

    $total    = (int) $wpdb->get_var( "SELECT COUNT(*) FROM $table" );
    $good     = (int) $wpdb->get_var( "SELECT COUNT(*) FROM $table WHERE score >= 80" );
    $warnings = (int) $wpdb->get_var( "SELECT COUNT(*) FROM $table WHERE score >= 50 AND score < 80" );
    $errors   = (int) $wpdb->get_var( "SELECT COUNT(*) FROM $table WHERE score < 50" );
    $avg      = (int) $wpdb->get_var( "SELECT AVG(score) FROM $table" );
    $last     = $wpdb->get_var( "SELECT MAX(scanned_at) FROM $table" );

    // Per-language breakdown.
    $per_lang = $wpdb->get_results(
        "SELECT lang, COUNT(*) as total, AVG(score) as avg_score,
                SUM(CASE WHEN score >= 80 THEN 1 ELSE 0 END) as good,
                SUM(CASE WHEN score < 80 THEN 1 ELSE 0 END) as issues
         FROM $table GROUP BY lang ORDER BY lang"
    );

    return rest_ensure_response( array(
        'total'     => $total,
        'good'      => $good,
        'warnings'  => $warnings,
        'errors'    => $errors,
        'avg_score' => $avg,
        'last_scan' => $last,
        'per_lang'  => $per_lang,
    ) );
}
