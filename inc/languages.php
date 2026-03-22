<?php
/**
 * Language integration — filter-based, themes/plugins provide the language list.
 *
 * @package SnelSEO
 */

defined( 'ABSPATH' ) || exit;

function snel_seo_get_languages() {
    return apply_filters( 'snel_seo_languages', array(
        array( 'code' => 'en', 'label' => 'EN', 'default' => true ),
    ) );
}

function snel_seo_get_default_lang() {
    $langs = snel_seo_get_languages();
    foreach ( $langs as $lang ) {
        if ( ! empty( $lang['default'] ) ) {
            return $lang['code'];
        }
    }
    return $langs[0]['code'] ?? 'en';
}

function snel_seo_get_current_lang() {
    return apply_filters( 'snel_seo_current_language', snel_seo_get_default_lang() );
}

function snel_seo_is_multilingual() {
    return count( snel_seo_get_languages() ) > 1;
}
