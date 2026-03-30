<?php
/**
 * Translation helpers — tag-safe AI translation for SEO content.
 *
 * All SEO fields (titles, descriptions) can contain template tags like
 * %%sitename%%, %%title%%, %%separator%%, %%sitedesc%%. When translating
 * these fields via AI, the tags must be preserved exactly as-is.
 *
 * This module provides a single entry point: snel_seo_translate_text().
 * It extracts tags, replaces them with numbered placeholders, sends only
 * the human-readable text to AI, then swaps the tags back in.
 *
 * @package SnelSEO
 */

defined( 'ABSPATH' ) || exit;

/**
 * Translate a text string while preserving %%template_tags%%.
 *
 * Flow:
 *   1. Extract all %%tags%% and replace with [1], [2], etc.
 *   2. If only tags remain (no translatable text), return original string.
 *   3. Send cleaned text to OpenAI for translation.
 *   4. Swap [1], [2] back to the original %%tags%%.
 *   5. Return the translated string with tags intact.
 *
 * @param string $text      The text to translate (may contain %%tags%%).
 * @param string $lang_code Target language code (e.g. 'en', 'de').
 * @param string $type      'title' or 'description' — affects max length guidance.
 * @return string|WP_Error  Translated text with tags preserved, or WP_Error on failure.
 */
function snel_seo_translate_text( $text, $lang_code, $type = 'description' ) {
    if ( ! $text || ! $lang_code ) {
        return new WP_Error( 'missing_params', 'Text and lang are required.', array( 'status' => 400 ) );
    }

    $api_key = SnelSeoConfig::ai_key();
    if ( empty( $api_key ) ) {
        return new WP_Error( 'no_api_key', 'OpenAI API key not configured. Go to Snelstack Settings to add your key.', array( 'status' => 400 ) );
    }

    // Step 1: Extract %%tags%% and replace with numbered placeholders.
    $tags    = array();
    $cleaned = preg_replace_callback( '/%%[a-zA-Z_]+%%/', function ( $match ) use ( &$tags ) {
        $index          = count( $tags ) + 1;
        $tags[ $index ] = $match[0];
        return "[{$index}]";
    }, $text );

    // Step 2: If nothing left to translate (only tags), return original.
    $text_only = trim( preg_replace( '/\[\d+\]/', '', $cleaned ) );
    if ( $text_only === '' ) {
        return $text;
    }

    // Step 3: Build prompt and call OpenAI.
    $lang_name = SnelSeoConfig::lang_name( $lang_code );
    $max_title = SnelSeoConfig::$max_title_length;
    $max_desc  = SnelSeoConfig::$max_desc_length;

    if ( 'title' === $type ) {
        $prompt = "Translate this SEO title to {$lang_name}. "
                . "Keep any numbered placeholders like [1], [2], [3] exactly as they are — do not translate, remove, or reorder them. "
                . "Only translate the human-readable text. Keep it under {$max_title} characters. "
                . "Return ONLY the translated text, nothing else.\n\nText: {$cleaned}";
    } else {
        $prompt = "Translate this SEO meta description to {$lang_name}. "
                . "Keep any numbered placeholders like [1], [2], [3] exactly as they are — do not translate, remove, or reorder them. "
                . "Only translate the human-readable text. Keep it between 120-{$max_desc} characters. "
                . "Return ONLY the translated text, nothing else.\n\nText: {$cleaned}";
    }

    $response = wp_remote_post( SnelSeoConfig::$ai_api_url, array(
        'timeout' => 30,
        'headers' => array( 'Authorization' => 'Bearer ' . $api_key, 'Content-Type' => 'application/json' ),
        'body'    => wp_json_encode( array(
            'model'       => SnelSeoConfig::ai_model(),
            'messages'    => array(
                array( 'role' => 'system', 'content' => 'You are a professional translator specializing in SEO content. Translate accurately while keeping all numbered placeholders exactly as they are.' ),
                array( 'role' => 'user', 'content' => $prompt ),
            ),
            'temperature' => SnelSeoConfig::$ai_temp_translation,
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
    $result = trim( $result, " \t\n\r\0\x0B\"'" );

    // Step 4: Swap placeholders back to original %%tags%%.
    foreach ( $tags as $index => $tag ) {
        $result = str_replace( "[{$index}]", $tag, $result );
    }

    return $result;
}

/**
 * Extract tags from text, returning the cleaned text and a tag map.
 * Useful for unit testing the extraction logic without calling OpenAI.
 *
 * @param string $text Text with %%tags%%.
 * @return array [ 'cleaned' => string, 'tags' => array, 'has_text' => bool ]
 */
function snel_seo_extract_tags( $text ) {
    $tags    = array();
    $cleaned = preg_replace_callback( '/%%[a-zA-Z_]+%%/', function ( $match ) use ( &$tags ) {
        $index          = count( $tags ) + 1;
        $tags[ $index ] = $match[0];
        return "[{$index}]";
    }, $text );

    $text_only = trim( preg_replace( '/\[\d+\]/', '', $cleaned ) );

    return array(
        'cleaned'  => $cleaned,
        'tags'     => $tags,
        'has_text' => $text_only !== '',
    );
}

/**
 * Restore tags into a translated string.
 * Useful for unit testing the restoration logic without calling OpenAI.
 *
 * @param string $translated The translated text with [1], [2] placeholders.
 * @param array  $tags       The tag map from snel_seo_extract_tags().
 * @return string Text with %%tags%% restored.
 */
function snel_seo_restore_tags( $translated, $tags ) {
    foreach ( $tags as $index => $tag ) {
        $translated = str_replace( "[{$index}]", $tag, $translated );
    }
    return $translated;
}
