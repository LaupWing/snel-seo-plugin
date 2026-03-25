<?php
/**
 * Frontend head output — title, meta description, OG tags, JSON-LD.
 *
 * @package SnelSEO
 */

defined( 'ABSPATH' ) || exit;

/**
 * Get the separator character.
 */
function snel_seo_get_separator() {
    $settings = get_option( 'wpseo_titles', array() );
    $sep_key  = isset( $settings['separator'] ) ? $settings['separator'] : 'sc-dash';
    $map      = array(
        'sc-dash'   => '–',
        'sc-hyphen' => '-',
        'sc-pipe'   => '|',
        'sc-middot' => '·',
        'sc-bullet' => '•',
        'sc-raquo'  => '»',
        'sc-slash'  => '/',
    );
    return isset( $map[ $sep_key ] ) ? $map[ $sep_key ] : '–';
}

/**
 * Resolve template variables.
 */
function snel_seo_resolve_template( $template, $vars = array() ) {
    foreach ( $vars as $key => $value ) {
        $template = str_replace( '%%' . $key . '%%', $value, $template );
    }
    return $template;
}

/**
 * Get a settings value that may be multilingual (JSON-encoded lang object).
 * Returns the value for the current language, falling back to default language.
 */
function snel_seo_get_ml_setting( $settings, $key, $fallback = '' ) {
    $raw = isset( $settings[ $key ] ) ? $settings[ $key ] : $fallback;
    if ( ! $raw ) return $fallback;

    if ( ! snel_seo_is_multilingual() ) {
        // Not multilingual — if it's a JSON string, extract default lang value.
        if ( is_string( $raw ) ) {
            $decoded = json_decode( $raw, true );
            if ( is_array( $decoded ) ) {
                $default = snel_seo_get_default_lang();
                return ! empty( $decoded[ $default ] ) ? $decoded[ $default ] : $fallback;
            }
        }
        return $raw;
    }

    $lang    = snel_seo_get_current_lang();
    $default = snel_seo_get_default_lang();

    if ( is_string( $raw ) ) {
        $decoded = json_decode( $raw, true );
        if ( is_array( $decoded ) ) {
            return ! empty( $decoded[ $lang ] ) ? $decoded[ $lang ] : ( ! empty( $decoded[ $default ] ) ? $decoded[ $default ] : $fallback );
        }
        // Plain string — return as-is (legacy).
        return $raw;
    }

    return $fallback;
}

/**
 * Get template variables for the current page context.
 */
function snel_seo_get_vars() {
    $settings = get_option( 'wpseo_titles', array() );
    return array(
        'sitename'  => isset( $settings['website_name'] ) ? $settings['website_name'] : get_bloginfo( 'name' ),
        'sitedesc'  => get_bloginfo( 'description' ),
        'separator' => snel_seo_get_separator(),
        'title'     => wp_title( '', false ),
        'category'  => single_cat_title( '', false ) ?: '',
    );
}

/**
 * Filter the document title.
 */
add_filter( 'pre_get_document_title', function ( $title ) {
    $settings = get_option( 'wpseo_titles', array() );
    $vars     = snel_seo_get_vars();

    if ( is_singular() ) {
        $post_id  = get_queried_object_id();
        $raw      = get_post_meta( $post_id, '_snel_seo_title', true );
        $titles   = $raw ? json_decode( $raw, true ) : array();
        $lang     = snel_seo_get_current_lang();
        $default  = snel_seo_get_default_lang();
        $custom   = ! empty( $titles[ $lang ] ) ? $titles[ $lang ] : ( ! empty( $titles[ $default ] ) ? $titles[ $default ] : '' );
        if ( $custom ) {
            return snel_seo_resolve_template( $custom, $vars );
        }
    }

    if ( is_front_page() || is_home() ) {
        $template = snel_seo_get_ml_setting( $settings, 'title-home-wpseo' );
        if ( $template ) {
            return snel_seo_resolve_template( $template, $vars );
        }
    }

    if ( is_singular( 'post' ) ) {
        $template = snel_seo_get_ml_setting( $settings, 'title-post' );
        if ( $template ) {
            $vars['title'] = get_the_title();
            return snel_seo_resolve_template( $template, $vars );
        }
    }

    if ( is_page() ) {
        $template = snel_seo_get_ml_setting( $settings, 'title-page' );
        if ( $template ) {
            $vars['title'] = get_the_title();
            return snel_seo_resolve_template( $template, $vars );
        }
    }

    return $title;
}, 15 );

/**
 * Auto-generate a meta description for any singular post.
 * Fallback chain: custom SEO desc → excerpt → content → post meta text fields → title.
 */
function snel_seo_auto_description( $post_id ) {
    // 1. Excerpt.
    $excerpt = get_the_excerpt( $post_id );
    if ( $excerpt && $excerpt !== __( 'No excerpt', 'default' ) ) {
        return wp_trim_words( wp_strip_all_tags( $excerpt ), 25, '…' );
    }

    // 2. Post content.
    $post = get_post( $post_id );
    if ( $post && ! empty( $post->post_content ) ) {
        $text = wp_strip_all_tags( strip_shortcodes( $post->post_content ) );
        $text = preg_replace( '/\s+/', ' ', trim( $text ) );
        if ( strlen( $text ) > 10 ) {
            return mb_substr( $text, 0, 155 ) . '…';
        }
    }

    // 3. Common meta fields (multilingual arrays or plain strings).
    $lang    = snel_seo_get_current_lang();
    $default = snel_seo_get_default_lang();
    $meta_keys = array( '_product_short_description', '_product_description', '_short_description', '_description' );

    foreach ( $meta_keys as $key ) {
        $val = get_post_meta( $post_id, $key, true );
        if ( ! $val ) continue;

        $text = '';
        if ( is_array( $val ) ) {
            $text = ! empty( $val[ $lang ] ) ? $val[ $lang ] : ( ! empty( $val[ $default ] ) ? $val[ $default ] : '' );
        } elseif ( is_string( $val ) ) {
            $decoded = json_decode( $val, true );
            if ( is_array( $decoded ) ) {
                $text = ! empty( $decoded[ $lang ] ) ? $decoded[ $lang ] : ( ! empty( $decoded[ $default ] ) ? $decoded[ $default ] : '' );
            } else {
                $text = $val;
            }
        }

        if ( $text ) {
            $text = wp_strip_all_tags( $text );
            $text = preg_replace( '/\s+/', ' ', trim( $text ) );
            if ( strlen( $text ) > 10 ) {
                return mb_substr( $text, 0, 155 ) . '…';
            }
        }
    }

    // 4. Title + site name.
    $settings  = get_option( 'wpseo_titles', array() );
    $site_name = isset( $settings['website_name'] ) ? $settings['website_name'] : get_bloginfo( 'name' );
    return get_the_title( $post_id ) . ' — ' . $site_name;
}

/**
 * Output canonical URL (language-aware).
 */
add_action( 'wp_head', function () {
    // Remove WordPress default canonical.
    remove_action( 'wp_head', 'rel_canonical' );

    $url = '';
    if ( is_singular() ) {
        $url = get_permalink();
    } elseif ( is_tax() || is_category() || is_tag() ) {
        $url = get_term_link( get_queried_object() );
    } elseif ( is_post_type_archive() ) {
        $url = get_post_type_archive_link( get_queried_object()->name );
    } elseif ( is_front_page() || is_home() ) {
        $url = home_url( '/' );
    }

    if ( $url && ! is_wp_error( $url ) ) {
        // Add language prefix if a translation helper exists.
        if ( function_exists( 'snel_url' ) ) {
            $url = snel_url( $url );
        }
        printf( '<link rel="canonical" href="%s" />' . "\n", esc_url( $url ) );
    }
}, 0 );

/**
 * Output meta description and Open Graph tags.
 */
add_action( 'wp_head', function () {
    $settings = get_option( 'wpseo_titles', array() );
    $vars     = snel_seo_get_vars();

    // Meta Description.
    $description = '';

    if ( is_singular() ) {
        $post_id = get_queried_object_id();
        $raw     = get_post_meta( $post_id, '_snel_seo_metadesc', true );
        $descs   = $raw ? json_decode( $raw, true ) : array();
        $lang    = snel_seo_get_current_lang();
        $default = snel_seo_get_default_lang();
        $custom  = ! empty( $descs[ $lang ] ) ? $descs[ $lang ] : ( ! empty( $descs[ $default ] ) ? $descs[ $default ] : '' );
        if ( $custom ) {
            $description = $custom;
        }
    }

    if ( ! $description ) {
        if ( is_front_page() || is_home() ) {
            $description = snel_seo_get_ml_setting( $settings, 'metadesc-home-wpseo' );
        } elseif ( is_singular( 'post' ) ) {
            $description = snel_seo_get_ml_setting( $settings, 'metadesc-post' );
        } elseif ( is_page() ) {
            $description = snel_seo_get_ml_setting( $settings, 'metadesc-page' );
        } elseif ( is_tax() || is_category() || is_tag() ) {
            $term = get_queried_object();
            if ( $term && ! empty( $term->description ) ) {
                $description = mb_substr( wp_strip_all_tags( $term->description ), 0, 155 );
            }
        }
    }

    // Singular fallback: auto-generate from content.
    if ( ! $description && is_singular() ) {
        $description = snel_seo_auto_description( get_queried_object_id() );
    }

    // Global fallback.
    if ( ! $description ) {
        $description = snel_seo_get_ml_setting( $settings, 'metadesc-home-wpseo' );
    }

    if ( $description ) {
        $description = snel_seo_resolve_template( $description, $vars );
        printf( '<meta name="description" content="%s" />' . "\n", esc_attr( $description ) );
    }

    // Open Graph.
    $og_title = '';
    $og_desc  = '';
    $og_image = '';

    // Language-aware OG URL.
    $og_url = is_singular() ? get_permalink() : home_url( '/' );
    if ( function_exists( 'snel_url' ) ) {
        $og_url = snel_url( $og_url );
    }

    if ( is_singular() ) {
        $post_id  = get_queried_object_id();
        $og_title = get_post_meta( $post_id, '_yoast_wpseo_opengraph-title', true );
        $og_desc  = get_post_meta( $post_id, '_yoast_wpseo_opengraph-description', true );
        $og_image = get_post_meta( $post_id, '_yoast_wpseo_opengraph-image', true );
    }

    if ( ! $og_title ) $og_title = wp_get_document_title();
    if ( ! $og_desc ) $og_desc = $description;
    if ( ! $og_image && is_singular() ) $og_image = get_the_post_thumbnail_url( get_queried_object_id(), 'large' );
    if ( ! $og_image ) $og_image = isset( $settings['default_og_image'] ) ? $settings['default_og_image'] : '';

    if ( $og_title ) printf( '<meta property="og:title" content="%s" />' . "\n", esc_attr( $og_title ) );
    if ( $og_desc ) printf( '<meta property="og:description" content="%s" />' . "\n", esc_attr( $og_desc ) );
    if ( $og_image ) printf( '<meta property="og:image" content="%s" />' . "\n", esc_url( $og_image ) );
    printf( '<meta property="og:url" content="%s" />' . "\n", esc_url( $og_url ) );
    printf( '<meta property="og:type" content="%s" />' . "\n", is_singular() && ! is_front_page() ? 'article' : 'website' );
    printf( '<meta property="og:site_name" content="%s" />' . "\n", esc_attr( $vars['sitename'] ) );
}, 1 );

/**
 * JSON-LD structured data.
 */
add_action( 'wp_head', function () {
    $settings  = get_option( 'wpseo_titles', array() );
    $site_name = isset( $settings['website_name'] ) ? $settings['website_name'] : get_bloginfo( 'name' );
    $site_url  = home_url( '/' );
    $og_image  = isset( $settings['default_og_image'] ) ? $settings['default_og_image'] : '';

    // Organization.
    $org = array( '@context' => 'https://schema.org', '@type' => 'Organization', 'name' => $site_name, 'url' => $site_url );
    if ( $og_image ) $org['logo'] = $og_image;
    printf( '<script type="application/ld+json">%s</script>' . "\n", wp_json_encode( $org, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) );

    // BreadcrumbList.
    if ( is_singular() ) {
        $post_id = get_queried_object_id();
        $items   = array();
        $pos     = 1;

        $items[] = array( '@type' => 'ListItem', 'position' => $pos++, 'name' => $site_name, 'item' => $site_url );

        if ( is_singular( 'product' ) ) {
            $terms = get_the_terms( $post_id, 'product_category' );
            if ( $terms && ! is_wp_error( $terms ) ) {
                $term    = $terms[0];
                $items[] = array( '@type' => 'ListItem', 'position' => $pos++, 'name' => $term->name, 'item' => get_term_link( $term ) );
            }
        }

        $items[] = array( '@type' => 'ListItem', 'position' => $pos, 'name' => get_the_title( $post_id ), 'item' => get_permalink( $post_id ) );

        $breadcrumb = array( '@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => $items );
        printf( '<script type="application/ld+json">%s</script>' . "\n", wp_json_encode( $breadcrumb, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) );
    }

    // Product.
    if ( is_singular( 'product' ) ) {
        $post_id = get_queried_object_id();
        $lang    = snel_seo_get_current_lang();
        $default = snel_seo_get_default_lang();
        $name    = get_the_title( $post_id );

        $desc_raw = get_post_meta( $post_id, '_product_short_description', true );
        $desc     = '';
        if ( $desc_raw ) {
            $descs = is_array( $desc_raw ) ? $desc_raw : json_decode( $desc_raw, true );
            if ( is_array( $descs ) ) {
                $desc = ! empty( $descs[ $lang ] ) ? $descs[ $lang ] : ( ! empty( $descs[ $default ] ) ? $descs[ $default ] : '' );
            } elseif ( is_string( $desc_raw ) ) {
                $desc = $desc_raw;
            }
        }

        $image     = get_the_post_thumbnail_url( $post_id, 'large' );
        $price_raw = get_post_meta( $post_id, '_price', true );
        $price     = $price_raw ? preg_replace( '/[^0-9.,]/', '', $price_raw ) : '';

        $product = array( '@context' => 'https://schema.org', '@type' => 'Product', 'name' => $name, 'url' => get_permalink( $post_id ) );
        if ( $desc ) $product['description'] = wp_strip_all_tags( $desc );
        if ( $image ) $product['image'] = $image;
        if ( $price ) {
            $product['offers'] = array( '@type' => 'Offer', 'price' => str_replace( ',', '.', $price ), 'priceCurrency' => 'EUR', 'availability' => 'https://schema.org/InStock' );
        }

        printf( '<script type="application/ld+json">%s</script>' . "\n", wp_json_encode( $product, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) );
    }
}, 2 );
