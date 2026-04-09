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
        object_type varchar(20) NOT NULL DEFAULT 'post',
        object_id bigint(20) UNSIGNED NOT NULL,
        lang varchar(5) NOT NULL DEFAULT 'nl',
        url text NOT NULL,
        content_hash varchar(32) DEFAULT NULL,
        checks longtext,
        score int(3) DEFAULT NULL,
        ai_summary text,
        scanned_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY object_lookup (object_type, object_id, lang),
        KEY scanned_at (scanned_at)
    ) $charset;";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta( $sql );
}
register_activation_hook( SNEL_SEO_PLUGIN_DIR . 'snel-seo.php', 'snel_seo_scanner_create_table' );

// Run dbDelta on admin_init to create or update the table schema.
add_action( 'admin_init', function () {
    $version_key = 'snel_seo_scans_db_version';
    $current     = '2.0'; // Bump when schema changes.
    if ( get_option( $version_key ) !== $current ) {
        snel_seo_scanner_create_table();
        // Migrate old post_id column to object_id if upgrading.
        snel_seo_scanner_migrate_columns();
        update_option( $version_key, $current );
    }
} );

/**
 * Migrate old post_id column to object_id + object_type.
 */
function snel_seo_scanner_migrate_columns() {
    global $wpdb;
    $table = $wpdb->prefix . 'snel_seo_scans';

    // Check if old post_id column exists.
    $columns = $wpdb->get_col( "SHOW COLUMNS FROM $table", 0 );
    if ( in_array( 'post_id', $columns, true ) && ! in_array( 'object_id', $columns, true ) ) {
        $wpdb->query( "ALTER TABLE $table CHANGE COLUMN post_id object_id bigint(20) UNSIGNED NOT NULL" );
    }
    if ( ! in_array( 'object_type', $columns, true ) ) {
        $wpdb->query( "ALTER TABLE $table ADD COLUMN object_type varchar(20) NOT NULL DEFAULT 'post' AFTER id" );
    }
    // Drop old index if exists.
    $indexes = $wpdb->get_results( "SHOW INDEX FROM $table WHERE Key_name = 'post_lang'" );
    if ( ! empty( $indexes ) ) {
        $wpdb->query( "ALTER TABLE $table DROP INDEX post_lang" );
    }
}

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

    // Body text (first 500 chars of main content area, excluding nav/footer).
    $content_html = '';
    if ( preg_match( '/<main[^>]*>(.*?)<\/main>/is', $html, $m ) ) {
        $content_html = $m[1];
    } elseif ( preg_match( '/<article[^>]*>(.*?)<\/article>/is', $html, $m ) ) {
        $content_html = $m[1];
    } elseif ( preg_match( '/<body[^>]*>(.*)<\/body>/is', $html, $m ) ) {
        $content_html = $m[1];
    }

    // Strip nav, header, footer elements from the content.
    $content_html = preg_replace( '/<(nav|header|footer)\b[^>]*>.*?<\/\1>/is', '', $content_html );

    if ( $content_html ) {
        $text = wp_strip_all_tags( $content_html );
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
        "4. content_lang — Is the PRIMARY product/page content in the correct language? This is a multilingual website — the body text WILL contain taglines, slogans, UI labels, button text, and form labels in other languages (like 'A WORLD OF BEAUTIFUL...' in English, or labels like 'VOORNAAM', 'VERZENDEN'). These are EXPECTED and should NOT count against the language check. Only judge the actual product description, heading, and informational text.\n" .
        "5. desc_relevance — Is the meta description relevant to the actual page content? If the meta description mentions the product/page topic, mark as ok.\n\n" .
        "Scoring: Each check is worth 20 points. ok=20, warning=10, error=0. Score is the sum (0-100).\n\n" .
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

    $status_code = wp_remote_retrieve_response_code( $response );
    if ( $status_code !== 200 ) {
        $error_body = wp_remote_retrieve_body( $response );
        return new WP_Error( 'ai_error', 'OpenAI returned HTTP ' . $status_code . ': ' . mb_substr( $error_body, 0, 200 ) );
    }

    $body = json_decode( wp_remote_retrieve_body( $response ), true );
    $content = $body['choices'][0]['message']['content'] ?? '';
    $result = json_decode( $content, true );

    if ( ! $result || ! isset( $result['checks'] ) ) {
        return new WP_Error( 'parse_error', 'Failed to parse AI response.' );
    }

    return $result;
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
 * Scan a single URL.
 *
 * Core reusable function: fetch → extract → hash check → AI analyze → store.
 *
 * @param string $url         The full URL to scan.
 * @param string $lang        Language code.
 * @param string $object_type 'post' or 'term'.
 * @param int    $object_id   Post ID or Term ID.
 * @return array Result with score, summary, etc. or error key.
 */
function snel_seo_scan_url( $url, $lang, $object_type, $object_id ) {
    global $wpdb;
    $table = $wpdb->prefix . 'snel_seo_scans';

    // Fetch the rendered page.
    $response = wp_remote_get( $url, array(
        'timeout'   => 15,
        'sslverify' => false,
    ) );

    if ( is_wp_error( $response ) || wp_remote_retrieve_response_code( $response ) !== 200 ) {
        return array(
            'object_type' => $object_type,
            'object_id'   => $object_id,
            'lang'        => $lang,
            'url'         => $url,
            'error'       => is_wp_error( $response ) ? $response->get_error_message() : 'HTTP ' . wp_remote_retrieve_response_code( $response ),
        );
    }

    $html      = wp_remote_retrieve_body( $response );
    $extracted = snel_seo_extract_from_html( $html );

    // Hash the extracted content to detect changes.
    $hash = md5( wp_json_encode( $extracted ) );

    // Check if content hasn't changed since last scan.
    $existing = $wpdb->get_row( $wpdb->prepare(
        "SELECT content_hash, checks, score, ai_summary FROM $table WHERE object_type = %s AND object_id = %d AND lang = %s",
        $object_type, $object_id, $lang
    ) );

    if ( $existing && $existing->content_hash === $hash ) {
        return array(
            'object_type' => $object_type,
            'object_id'   => $object_id,
            'lang'        => $lang,
            'url'         => $url,
            'score'       => (int) $existing->score,
            'checks'      => json_decode( $existing->checks, true ) ?: array(),
            'ai_summary'  => $existing->ai_summary,
            'summary'     => $existing->ai_summary,
            'skipped'     => true,
        );
    }

    // Content changed or first scan — call AI.
    $analysis = snel_seo_scanner_analyze( $url, $lang, $extracted );

    if ( is_wp_error( $analysis ) ) {
        return array(
            'object_type' => $object_type,
            'object_id'   => $object_id,
            'lang'        => $lang,
            'url'         => $url,
            'error'       => $analysis->get_error_message(),
        );
    }

    // Delete previous scan for this object+lang.
    $wpdb->delete( $table, array( 'object_type' => $object_type, 'object_id' => $object_id, 'lang' => $lang ) );

    // Insert new result.
    $wpdb->insert( $table, array(
        'object_type'  => $object_type,
        'object_id'    => $object_id,
        'lang'         => $lang,
        'url'          => $url,
        'content_hash' => $hash,
        'checks'       => wp_json_encode( $analysis['checks'] ?? array() ),
        'score'        => (int) ( $analysis['score'] ?? 0 ),
        'ai_summary'   => $analysis['summary'] ?? '',
        'scanned_at'   => current_time( 'mysql' ),
    ) );

    return array(
        'object_type' => $object_type,
        'object_id'   => $object_id,
        'lang'        => $lang,
        'url'         => $url,
        'score'       => $analysis['score'] ?? 0,
        'checks'      => $analysis['checks'] ?? array(),
        'ai_summary'  => $analysis['summary'] ?? '',
        'summary'     => $analysis['summary'] ?? '',
    );
}

/**
 * Build a language-specific URL from a base permalink.
 */
function snel_seo_build_lang_url( $permalink, $lang ) {
    $default_lang = snel_seo_get_default_lang();
    if ( $lang === $default_lang ) {
        return $permalink;
    }
    $path = wp_parse_url( $permalink, PHP_URL_PATH );
    return home_url( '/' . $lang . $path );
}

/**
 * REST endpoints.
 */
add_action( 'rest_api_init', function () {
    // Scan a batch of posts and/or terms.
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

    // Get scannable queue (posts + terms).
    register_rest_route( SnelSeoConfig::$rest_namespace, '/scanner/queue', array(
        'methods'             => 'GET',
        'callback'            => 'snel_seo_scanner_queue',
        'permission_callback' => function () { return current_user_can( 'manage_options' ); },
    ) );
} );

/**
 * Get all scannable items (posts + terms).
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

    // Get public taxonomy terms.
    $taxonomies = get_taxonomies( array( 'public' => true ), 'names' );
    $exclude_tax = array( 'category', 'post_tag', 'post_format' );
    $term_ids = array();
    foreach ( $taxonomies as $tax ) {
        if ( in_array( $tax, $exclude_tax, true ) ) continue;
        $terms = get_terms( array( 'taxonomy' => $tax, 'hide_empty' => false, 'fields' => 'ids' ) );
        if ( ! is_wp_error( $terms ) ) {
            $term_ids = array_merge( $term_ids, $terms );
        }
    }

    // Get supported languages.
    $languages = array( snel_seo_get_default_lang() );
    if ( has_filter( 'snel_seo_languages' ) ) {
        $all_langs = apply_filters( 'snel_seo_languages', array() );
        $languages = wp_list_pluck( $all_langs, 'code' );
    }

    return rest_ensure_response( array(
        'post_ids'  => $posts,
        'term_ids'  => array_values( array_unique( $term_ids ) ),
        'languages' => $languages,
        'total'     => ( count( $posts ) + count( $term_ids ) ) * count( $languages ),
    ) );
}

/**
 * Scan a batch of pages (posts and/or terms).
 */
function snel_seo_scanner_batch( WP_REST_Request $request ) {
    $params   = $request->get_json_params();
    $post_ids = $params['post_ids'] ?? array();
    $term_ids = $params['term_ids'] ?? array();
    $langs    = $params['languages'] ?? array( snel_seo_get_default_lang() );

    if ( empty( $post_ids ) && empty( $term_ids ) ) {
        return new WP_Error( 'no_items', 'No post or term IDs provided.', array( 'status' => 400 ) );
    }

    $results = array();

    // Scan posts.
    foreach ( $post_ids as $post_id ) {
        $post = get_post( (int) $post_id );
        if ( ! $post ) continue;

        $permalink = get_permalink( $post_id );

        foreach ( $langs as $lang ) {
            $url    = snel_seo_build_lang_url( $permalink, $lang );
            $result = snel_seo_scan_url( $url, $lang, 'post', (int) $post_id );
            // Add backward-compat post_id key.
            $result['post_id'] = (int) $post_id;
            $results[] = $result;
        }
    }

    // Scan terms.
    foreach ( $term_ids as $term_id ) {
        $term = get_term( (int) $term_id );
        if ( ! $term || is_wp_error( $term ) ) continue;

        $permalink = get_term_link( $term );
        if ( is_wp_error( $permalink ) ) continue;

        foreach ( $langs as $lang ) {
            $url    = snel_seo_build_lang_url( $permalink, $lang );
            $result = snel_seo_scan_url( $url, $lang, 'term', (int) $term_id );
            $result['term_id'] = (int) $term_id;
            $results[] = $result;
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

    $page        = max( 1, (int) $request->get_param( 'page' ) ?: 1 );
    $per_page    = min( 100, max( 1, (int) $request->get_param( 'per_page' ) ?: 20 ) );
    $lang        = sanitize_text_field( $request->get_param( 'lang' ) ?: '' );
    $status      = sanitize_text_field( $request->get_param( 'status' ) ?: '' );
    $object_type = sanitize_text_field( $request->get_param( 'object_type' ) ?: '' );
    $object_id   = (int) $request->get_param( 'object_id' );
    // Backward compat: accept post_id param.
    if ( ! $object_id ) {
        $object_id = (int) $request->get_param( 'post_id' );
        if ( $object_id && ! $object_type ) $object_type = 'post';
    }
    $offset = ( $page - 1 ) * $per_page;

    $where = '1=1';
    $args  = array();

    if ( $object_type ) {
        $where .= ' AND object_type = %s';
        $args[] = $object_type;
    }

    if ( $object_id ) {
        $where .= ' AND object_id = %d';
        $args[] = $object_id;
    }

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

    // Decode checks JSON and add title.
    foreach ( $rows as &$row ) {
        $row->checks = json_decode( $row->checks, true );
        if ( $row->object_type === 'term' ) {
            $term = get_term( $row->object_id );
            $row->post_title = $term && ! is_wp_error( $term ) ? $term->name : 'Term #' . $row->object_id;
        } else {
            $row->post_title = get_the_title( $row->object_id );
        }
        // Backward compat.
        $row->post_id = $row->object_id;
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
