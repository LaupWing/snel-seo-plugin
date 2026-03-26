<?php
/**
 * REST API endpoints — generate, render, analyze, suggest keyphrases.
 *
 * @package SnelSEO
 */

defined( 'ABSPATH' ) || exit;

/**
 * Generate endpoint registration.
 */
add_action( 'rest_api_init', function () {
    register_rest_route( SnelSeoConfig::$rest_namespace, '/generate/(?P<id>\d+)', array(
        'methods'             => 'POST',
        'callback'            => 'snel_seo_generate_meta',
        'permission_callback' => function ( $request ) { return current_user_can( 'edit_post', $request['id'] ); },
    ) );
} );

/**
 * Render endpoint — server-side content extraction per language.
 */
add_action( 'rest_api_init', function () {
    register_rest_route( SnelSeoConfig::$rest_namespace, '/render/(?P<id>\d+)', array(
        'methods'  => 'GET',
        'callback' => function ( $request ) {
            $post_id = (int) $request['id'];
            $lang    = $request->get_param( 'lang' ) ?: snel_seo_get_default_lang();

            $post = get_post( $post_id );
            if ( ! $post ) {
                return new WP_Error( 'no_post', 'Post not found.', array( 'status' => 404 ) );
            }

            if ( class_exists( 'LocaleManager' ) ) {
                LocaleManager::setOverride( $lang );
            }
            add_filter( 'snel_seo_current_language', function () use ( $lang ) { return $lang; }, 999 );

            $html = do_blocks( $post->post_content );

            if ( class_exists( 'LocaleManager' ) ) {
                LocaleManager::setOverride( null );
            }

            $headings = array();
            if ( preg_match_all( '/<h[1-6]\b[^>]*>(.+?)<\/h[1-6]>/is', $html, $matches ) ) {
                foreach ( $matches[1] as $inner ) {
                    $clean = trim( html_entity_decode( wp_strip_all_tags( $inner ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
                    if ( $clean ) $headings[] = $clean;
                }
            }

            $paragraphs = array();
            if ( preg_match_all( '/<p\b[^>]*>(.+?)<\/p>/is', $html, $matches ) ) {
                foreach ( $matches[1] as $inner ) {
                    $clean = trim( html_entity_decode( wp_strip_all_tags( $inner ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
                    if ( $clean && strlen( $clean ) > 3 ) $paragraphs[] = $clean;
                }
            }

            return rest_ensure_response( array(
                'lang'       => $lang,
                'headings'   => $headings,
                'paragraphs' => $paragraphs,
                'full_text'  => implode( "\n", array_merge( $headings, $paragraphs ) ),
            ) );
        },
        'permission_callback' => function ( $request ) { return current_user_can( 'edit_post', $request['id'] ); },
    ) );
} );

/**
 * Analyze endpoint — AI-powered SEO check.
 */
add_action( 'rest_api_init', function () {
    register_rest_route( SnelSeoConfig::$rest_namespace, '/analyze/(?P<id>\d+)', array(
        'methods'  => 'POST',
        'callback' => function ( $request ) {
            $params    = $request->get_json_params();
            $check     = $params['check'] ?? '';
            $keyphrase = sanitize_text_field( $params['keyphrase'] ?? '' );
            $seo_title = sanitize_text_field( $params['seo_title'] ?? '' );
            $meta_desc = sanitize_text_field( $params['meta_desc'] ?? '' );
            $content   = sanitize_textarea_field( $params['content'] ?? '' );
            $url       = esc_url_raw( $params['url'] ?? '' );

            $api_key = SnelSeoConfig::ai_key();
            if ( empty( $api_key ) ) {
                return new WP_Error( 'no_api_key', 'OpenAI API key not configured.', array( 'status' => 400 ) );
            }

            $prompts = array(
                'title'       => "Check if the SEO title contains the focus keyphrase (exact match or close variation). The keyphrase can appear anywhere in the title. Case-insensitive. Pass if the keyphrase or a very close variation is present.\n\nKeyphrase: {$keyphrase}\nSEO Title: {$seo_title}",
                'description' => "Check if the meta description contains the focus keyphrase (exact match or close variation). Also assess if the description is compelling and has a call to action. Pass if the keyphrase is present and the description is decent.\n\nKeyphrase: {$keyphrase}\nMeta Description: {$meta_desc}",
                'opening'     => "The content below includes navigation elements (menus, search bars, buttons) — ignore those. Focus on the main body content only. Does the keyphrase appear in the first 2-3 actual content paragraphs (not navigation)?\n\nKeyphrase: {$keyphrase}\nContent:\n" . mb_substr( $content, 0, 1500 ),
                'body'        => "The content below includes navigation elements (menus, search bars, buttons) — ignore those. Focus on main body content only. Count how many times the keyphrase appears in the body content. Pass if it appears 2+ times naturally. Fail if 0-1 times (underused) or 10+ times (keyword stuffing).\n\nKeyphrase: {$keyphrase}\nContent:\n" . mb_substr( $content, 0, 3000 ),
                'url'         => "Check if the URL slug contains the focus keyphrase or a slugified version of it (words separated by hyphens, no special characters). Pass if present, fail if not.\n\nKeyphrase: {$keyphrase}\nURL: {$url}",
                'overall'     => "The content includes navigation elements — ignore those. Give an overall SEO assessment for how well this page targets the focus keyphrase. Consider: Is the keyphrase in the title, description, headings, and body? Is the content relevant to the keyphrase? Any structural improvements needed?\n\nKeyphrase: {$keyphrase}\nSEO Title: {$seo_title}\nMeta Description: {$meta_desc}\nURL: {$url}\nContent:\n" . mb_substr( $content, 0, 2000 ),
            );

            if ( ! isset( $prompts[ $check ] ) ) {
                return new WP_Error( 'invalid_check', 'Unknown check type.', array( 'status' => 400 ) );
            }

            $model    = SnelSeoConfig::ai_model();
            $response = wp_remote_post( SnelSeoConfig::$ai_api_url, array(
                'timeout' => 30,
                'headers' => array( 'Authorization' => 'Bearer ' . $api_key, 'Content-Type' => 'application/json' ),
                'body'    => wp_json_encode( array(
                    'model'    => $model,
                    'messages' => array(
                        array( 'role' => 'system', 'content' => 'You are an SEO expert analyzing a webpage. ALWAYS respond in English regardless of the content language. Be factual, not subjective. Respond in JSON format only: { "pass": true/false, "message": "short factual assessment (1 sentence)", "suggestion": "specific actionable improvement tip, or empty string if pass is true" }. Be concise.' ),
                        array( 'role' => 'user', 'content' => $prompts[ $check ] ),
                    ),
                    'temperature'     => SnelSeoConfig::$ai_temp_analysis,
                    'response_format' => array( 'type' => 'json_object' ),
                ) ),
            ) );

            if ( is_wp_error( $response ) ) {
                return new WP_Error( 'api_error', $response->get_error_message(), array( 'status' => 500 ) );
            }

            $body   = json_decode( wp_remote_retrieve_body( $response ), true );
            $parsed = json_decode( $body['choices'][0]['message']['content'] ?? '{}', true );

            if ( ! is_array( $parsed ) || ! isset( $parsed['pass'] ) ) {
                return new WP_Error( 'parse_error', 'Could not parse AI response.', array( 'status' => 500 ) );
            }

            return rest_ensure_response( array(
                'check'      => $check,
                'pass'       => (bool) $parsed['pass'],
                'message'    => sanitize_text_field( $parsed['message'] ?? '' ),
                'suggestion' => sanitize_text_field( $parsed['suggestion'] ?? '' ),
            ) );
        },
        'permission_callback' => function ( $request ) { return current_user_can( 'edit_post', $request['id'] ); },
    ) );
} );

/**
 * Suggest keyphrases endpoint.
 */
add_action( 'rest_api_init', function () {
    register_rest_route( SnelSeoConfig::$rest_namespace, '/suggest-keyphrases/(?P<id>\d+)', array(
        'methods'  => 'POST',
        'callback' => function ( $request ) {
            $params  = $request->get_json_params();
            $content = mb_substr( sanitize_textarea_field( $params['content'] ?? '' ), 0, 3000 );
            $lang    = sanitize_text_field( $params['lang'] ?? 'nl' );

            $api_key = SnelSeoConfig::ai_key();
            if ( empty( $api_key ) ) {
                return new WP_Error( 'no_api_key', 'OpenAI API key not configured.', array( 'status' => 400 ) );
            }

            $lang_name = SnelSeoConfig::lang_name( $lang );

            $model    = SnelSeoConfig::ai_model();
            $response = wp_remote_post( SnelSeoConfig::$ai_api_url, array(
                'timeout' => 30,
                'headers' => array( 'Authorization' => 'Bearer ' . $api_key, 'Content-Type' => 'application/json' ),
                'body'    => wp_json_encode( array(
                    'model'    => $model,
                    'messages' => array(
                        array( 'role' => 'system', 'content' => 'You are an SEO expert. Suggest focus keyphrases that a user would type into Google to find this page. Respond in JSON format only: { "keyphrases": [ { "keyphrase": "the keyphrase", "reason": "why this is a good keyphrase (1 sentence, in English)" } ] }. Return exactly 5 suggestions. The keyphrases must be in ' . $lang_name . '. Keep keyphrases concise (1-4 words). Reasons must always be in English.' ),
                        array( 'role' => 'user', 'content' => "Suggest 5 SEO focus keyphrases in {$lang_name} for this page content. The content includes navigation elements — ignore those and focus on the main body content.\n\nContent:\n{$content}" ),
                    ),
                    'temperature'     => SnelSeoConfig::$ai_temp_suggestion,
                    'response_format' => array( 'type' => 'json_object' ),
                ) ),
            ) );

            if ( is_wp_error( $response ) ) {
                return new WP_Error( 'api_error', $response->get_error_message(), array( 'status' => 500 ) );
            }

            $body   = json_decode( wp_remote_retrieve_body( $response ), true );
            $parsed = json_decode( $body['choices'][0]['message']['content'] ?? '{}', true );

            if ( ! is_array( $parsed ) || ! isset( $parsed['keyphrases'] ) ) {
                return new WP_Error( 'parse_error', 'Could not parse AI response.', array( 'status' => 500 ) );
            }

            return rest_ensure_response( $parsed );
        },
        'permission_callback' => function ( $request ) { return current_user_can( 'edit_post', $request['id'] ); },
    ) );
} );

/**
 * Generate SEO title/description/keyphrase via OpenAI.
 */
function snel_seo_generate_meta( WP_REST_Request $request ) {
    $post_id = (int) $request['id'];
    $params  = $request->get_json_params();
    $type    = $params['type'] ?? 'description';
    $lang    = $params['lang'] ?? snel_seo_get_default_lang();

    $lang_name     = SnelSeoConfig::lang_name( $lang );
    $max_title     = SnelSeoConfig::$max_title_length;
    $max_desc      = SnelSeoConfig::$max_desc_length;

    $api_key = SnelSeoConfig::ai_key();
    if ( empty( $api_key ) ) {
        return new WP_Error( 'no_api_key', 'OpenAI API key not configured. Go to Snelstack Settings to add your key.', array( 'status' => 400 ) );
    }

    $post = get_post( $post_id );
    if ( ! $post ) {
        return new WP_Error( 'no_post', 'Post not found.', array( 'status' => 404 ) );
    }

    if ( ! empty( $params['content'] ) ) {
        $content = sanitize_textarea_field( $params['content'] );
    } else {
        $html  = do_blocks( $post->post_content );
        $texts = array();
        if ( preg_match_all( '/<(?:h[1-6]|p)\b[^>]*>(.+?)<\/(?:h[1-6]|p)>/is', $html, $matches ) ) {
            foreach ( $matches[1] as $inner ) {
                $clean = trim( wp_strip_all_tags( $inner ) );
                if ( $clean && strlen( $clean ) > 3 ) $texts[] = $clean;
            }
        }
        $content = implode( "\n", $texts );
    }
    $content = mb_substr( $content, 0, 3000 );
    $title   = $post->post_title;

    $settings  = get_option( SnelSeoConfig::$option_titles, array() );
    $site_name = isset( $settings['website_name'] ) ? $settings['website_name'] : get_bloginfo( 'name' );
    $separator = snel_seo_get_separator();

    if ( 'title' === $type ) {
        $prompt = "Generate an SEO-optimized title in {$lang_name} for the following page. "
                . "The format should be: [compelling page title] {$separator} {$site_name}. "
                . "The total length must be under {$max_title} characters including the separator and site name. "
                . "Write in {$lang_name}. Return ONLY the full title with separator and site name, nothing else.\n\n"
                . "Page title: {$title}\nPage content: {$content}";
    } elseif ( 'keyphrase' === $type ) {
        $source_kw = sanitize_text_field( $params['source_keyphrase'] ?? '' );
        $prompt = "Translate this SEO focus keyphrase to {$lang_name}. "
                . "Keep it concise (1-4 words). It should be the search term a {$lang_name}-speaking user would type into Google. "
                . "Return ONLY the translated keyphrase, nothing else.\n\nKeyphrase: {$source_kw}";
    } else {
        $prompt = "Generate an SEO-optimized meta description in {$lang_name} for the following page. "
                . "Keep it between 120-{$max_desc} characters. Make it compelling and include a call to action if appropriate. "
                . "Write in {$lang_name}. Return ONLY the meta description, nothing else.\n\n"
                . "Page title: {$title}\nPage content: {$content}";
    }

    $model    = SnelSeoConfig::ai_model();
    $response = wp_remote_post( SnelSeoConfig::$ai_api_url, array(
        'timeout' => 30,
        'headers' => array( 'Authorization' => 'Bearer ' . $api_key, 'Content-Type' => 'application/json' ),
        'body'    => wp_json_encode( array(
            'model'       => $model,
            'messages'    => array(
                array( 'role' => 'system', 'content' => 'You are an SEO expert. Write concise, compelling meta content that drives clicks from search results.' ),
                array( 'role' => 'user', 'content' => $prompt ),
            ),
            'temperature' => SnelSeoConfig::$ai_temp_generation,
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
    $result = trim( $result, '"\'' );

    // Decode unicode escapes and HTML entities.
    $result = preg_replace_callback( '/\\\\u([0-9a-fA-F]{4})/', function ( $m ) {
        return mb_convert_encoding( pack( 'H*', $m[1] ), 'UTF-8', 'UCS-2BE' );
    }, $result );
    $result = html_entity_decode( $result, ENT_QUOTES | ENT_HTML5, 'UTF-8' );

    return rest_ensure_response( array( 'result' => $result ) );
}
