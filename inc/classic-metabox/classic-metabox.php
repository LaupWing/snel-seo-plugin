<?php
/**
 * Classic editor SEO meta box — for post types that don't use Gutenberg (e.g. product).
 * Renders SEO title, meta description, Google Preview, Social Preview, language tabs, and Translate All.
 *
 * @package SnelSEO
 */

defined( 'ABSPATH' ) || exit;

/**
 * Get fallback title for a language using dynamic config or post_title.
 */
function snel_seo_classic_get_fallback_title( $post, $lang, $default_lang ) {
    if ( $lang === $default_lang ) {
        return $post->post_title;
    }
    // Try per-language title meta key (e.g. _title_de).
    $translated = get_post_meta( $post->ID, '_title_' . $lang, true );
    return $translated ? $translated : $post->post_title;
}

/**
 * Get fallback description for a language using dynamic config from Settings > Post Types.
 * Falls back to excerpt if no config is set.
 */
function snel_seo_classic_get_fallback_desc( $post_id, $lang, $default_lang ) {
    $post_type  = get_post_type( $post_id );
    $cpt_config = snel_seo_get_cpt_config( $post_type );
    $fallbacks  = isset( $cpt_config['desc_fallback_keys'] ) ? $cpt_config['desc_fallback_keys'] : array();

    foreach ( $fallbacks as $field_key ) {
        // Handle per-language pattern: '_something_{lang}'.
        if ( strpos( $field_key, '_{lang}' ) !== false ) {
            $key = str_replace( '_{lang}', '_' . $lang, $field_key );
            $val = get_post_meta( $post_id, $key, true );
            if ( $val && is_string( $val ) ) {
                return mb_substr( wp_strip_all_tags( $val ), 0, 155 );
            }
            // Try default language.
            $key_default = str_replace( '_{lang}', '_' . $default_lang, $field_key );
            $val = get_post_meta( $post_id, $key_default, true );
            if ( $val && is_string( $val ) ) {
                return mb_substr( wp_strip_all_tags( $val ), 0, 155 );
            }
            continue;
        }

        // Multilingual array or plain string.
        $val = get_post_meta( $post_id, $field_key, true );
        if ( ! $val ) continue;

        if ( is_array( $val ) ) {
            if ( ! empty( $val[ $lang ] ) ) return mb_substr( wp_strip_all_tags( $val[ $lang ] ), 0, 155 );
            if ( ! empty( $val[ $default_lang ] ) ) return mb_substr( wp_strip_all_tags( $val[ $default_lang ] ), 0, 155 );
        } elseif ( is_string( $val ) && $val ) {
            return mb_substr( wp_strip_all_tags( $val ), 0, 155 );
        }
    }

    return '';
}

/**
 * Render the classic SEO meta box content.
 */
function snel_seo_classic_metabox_render( $post ) {
    $languages    = snel_seo_get_languages();
    $default_lang = snel_seo_get_default_lang();
    $multilingual = snel_seo_is_multilingual();

    $settings  = get_option( SnelSeoConfig::$option_titles, array() );
    $site_name = isset( $settings['website_name'] ) ? $settings['website_name'] : get_bloginfo( 'name' );
    $separator = SnelSeoConfig::get_separator();

    // Load existing SEO meta.
    $raw_title = get_post_meta( $post->ID, SnelSeoConfig::$meta_title, true );
    $raw_desc  = get_post_meta( $post->ID, SnelSeoConfig::$meta_desc, true );
    $seo_titles = $raw_title ? json_decode( $raw_title, true ) : array();
    $seo_descs  = $raw_desc ? json_decode( $raw_desc, true ) : array();

    if ( ! is_array( $seo_titles ) ) $seo_titles = array();
    if ( ! is_array( $seo_descs ) ) $seo_descs = array();

    // Pre-fill description from fallback fields if SEO fields are empty.
    // Title is NOT pre-filled — the template wraps %%title%% at render time.
    foreach ( $languages as $lang ) {
        $code = $lang['code'];
        if ( empty( $seo_descs[ $code ] ) ) {
            $seo_descs[ $code ] = snel_seo_classic_get_fallback_desc( $post->ID, $code, $default_lang );
        }
    }

    $permalink    = get_permalink( $post->ID );
    $nonce        = wp_create_nonce( 'wp_rest' );
    $rest_url     = rest_url( SnelSeoConfig::$rest_namespace );
    $favicon      = get_site_icon_url( 28 );
    $featured_img = get_the_post_thumbnail_url( $post->ID, 'large' );
    $og_image     = $featured_img ?: ( isset( $settings['default_og_image'] ) ? $settings['default_og_image'] : '' );
    $domain       = wp_parse_url( $permalink, PHP_URL_HOST ) ?: 'example.com';

    wp_nonce_field( 'snel_seo_classic_metabox', 'snel_seo_classic_nonce' );
    ?>

    <style>
        .snel-seo-classic { font-size: 13px; }
        .snel-seo-classic .snel-seo-lang-switcher { display: flex; gap: 4px; align-items: center; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid #e0e0e0; }
        .snel-seo-classic .snel-seo-lang-btn { padding: 4px 12px; border: 1px solid #c3c4c7; background: #f0f0f1; color: #50575e; cursor: pointer; font-size: 12px; font-weight: 600; line-height: 1.5; border-radius: 3px; position: relative; }
        .snel-seo-classic .snel-seo-lang-btn.active { background: #2271b1; color: #fff; border-color: #2271b1; }
        .snel-seo-classic .snel-seo-lang-btn:hover:not(.active) { background: #e0e0e0; }
        .snel-seo-classic .snel-seo-lang-btn .snel-seo-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-left: 4px; vertical-align: middle; }
        .snel-seo-classic .snel-seo-dot-green { background: #00a32a; }
        .snel-seo-classic .snel-seo-dot-amber { background: #dba617; }
        .snel-seo-classic .snel-seo-dot-gray { background: #c3c4c7; }
        .snel-seo-classic .snel-seo-translate-all { margin-left: 12px; color: #6b21a8; border-color: #d8b4fe; background: #faf5ff; }
        .snel-seo-classic .snel-seo-translate-all:hover { background: #f3e8ff; }
        .snel-seo-classic .snel-seo-field { margin-bottom: 14px; }
        .snel-seo-classic .snel-seo-field label { display: block; font-weight: 600; font-size: 12px; margin-bottom: 4px; text-transform: uppercase; color: #50575e; }
        .snel-seo-classic .snel-seo-field input,
        .snel-seo-classic .snel-seo-field textarea { width: 100%; }
        .snel-seo-classic .snel-seo-char-count { font-size: 11px; color: #888; margin-top: 2px; }
        .snel-seo-classic .snel-seo-char-count.over { color: #d63638; }
        .snel-seo-classic .snel-seo-translate-status { margin-left: 8px; font-style: italic; color: #666; font-size: 12px; }

        /* Tabs */
        .snel-seo-classic .snel-seo-tabs { display: flex; gap: 0; border-bottom: 2px solid #e0e0e0; margin-bottom: 16px; }
        .snel-seo-classic .snel-seo-tab { padding: 8px 16px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #999; background: none; border: none; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.15s; display: flex; align-items: center; gap: 6px; }
        .snel-seo-classic .snel-seo-tab:hover { color: #50575e; }
        .snel-seo-classic .snel-seo-tab.active { color: #2271b1; border-bottom-color: #2271b1; }
        .snel-seo-classic .snel-seo-tab-panel { display: none; }
        .snel-seo-classic .snel-seo-tab-panel.active { display: block; }
        .snel-seo-classic .snel-seo-info-box { background: #f0f6fc; border: 1px solid #c5d9ed; border-radius: 4px; padding: 10px 14px; font-size: 12px; color: #2271b1; margin-bottom: 14px; line-height: 1.5; }
        .snel-seo-classic .snel-seo-info-box.amber { background: #fcf9e8; border-color: #dba617; color: #8a6d00; }

        /* Google Preview */
        .snel-seo-classic .snel-seo-gp { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-top: 10px; }
        .snel-seo-classic .snel-seo-gp-header { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
        .snel-seo-classic .snel-seo-gp-header-label { font-size: 11px; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; }
        .snel-seo-classic .snel-seo-gp-favicon-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .snel-seo-classic .snel-seo-gp-favicon { width: 28px; height: 28px; background: #f1f3f4; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .snel-seo-classic .snel-seo-gp-favicon img { width: 20px; height: 20px; object-fit: contain; }
        .snel-seo-classic .snel-seo-gp-domain { font-size: 13px; color: #202124; }
        .snel-seo-classic .snel-seo-gp-path { font-size: 12px; color: #5f6368; }
        .snel-seo-classic .snel-seo-gp-title { font-size: 20px; line-height: 1.3; color: #1a0dab; font-family: arial, sans-serif; margin: 4px 0; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .snel-seo-classic .snel-seo-gp-title:hover { text-decoration: underline; }
        .snel-seo-classic .snel-seo-gp-desc { font-size: 14px; color: #4d5156; font-family: arial, sans-serif; line-height: 1.58; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

    </style>

    <div class="snel-seo-classic">

        <!-- Tabs -->
        <div class="snel-seo-tabs">
            <button type="button" class="snel-seo-tab active" data-tab="preview">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                <?php esc_html_e( 'Preview', 'snel-seo' ); ?>
            </button>
            <button type="button" class="snel-seo-tab" data-tab="custom-seo">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>
                <?php esc_html_e( 'Custom SEO', 'snel-seo' ); ?>
            </button>
        </div>

        <!-- Preview Tab -->
        <div class="snel-seo-tab-panel active" data-tab="preview">
            <?php if ( $multilingual ) : ?>
            <div class="snel-seo-lang-switcher" style="border-bottom:none;margin-bottom:8px;padding-bottom:0;">
                <?php foreach ( $languages as $lang ) :
                    $code = $lang['code'];
                ?>
                    <button type="button"
                        class="snel-seo-lang-btn snel-seo-preview-lang-btn<?php echo $code === $default_lang ? ' active' : ''; ?>"
                        data-lang="<?php echo esc_attr( $code ); ?>">
                        <?php echo esc_html( $lang['label'] ); ?>
                        <?php if ( $lang['default'] ) : ?>
                            <span style="font-size:10px;">(<?php esc_html_e( 'default', 'snel-seo' ); ?>)</span>
                        <?php endif; ?>
                    </button>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>

            <div class="snel-seo-info-box">
                <?php esc_html_e( 'This preview shows how your product appears in Google. Title and description are generated from your SEO templates and product fields. Use the "Custom SEO" tab to override.', 'snel-seo' ); ?>
            </div>

            <?php foreach ( $languages as $lang ) :
                $code  = $lang['code'];
                $title = isset( $seo_titles[ $code ] ) ? $seo_titles[ $code ] : '';
                $desc  = isset( $seo_descs[ $code ] ) ? $seo_descs[ $code ] : '';
                $is_active = ( $code === $default_lang );

                $fallback_title = snel_seo_classic_get_fallback_title( $post, $code, $default_lang );
                $preview_title = ( $title ?: $fallback_title ) . ' ' . $separator . ' ' . $site_name;
                $preview_desc  = $desc ?: '';

                $url_parts = explode( '/', trim( wp_parse_url( $permalink, PHP_URL_PATH ) ?: '', '/' ) );
                $url_path  = implode( ' › ', array_filter( $url_parts ) );
            ?>
            <div class="snel-seo-lang-panel-preview <?php echo $is_active ? 'active' : ''; ?>" data-lang="<?php echo esc_attr( $code ); ?>" <?php echo $is_active ? '' : 'style="display:none;"'; ?>>
                <div class="snel-seo-gp" data-lang="<?php echo esc_attr( $code ); ?>">
                    <div class="snel-seo-gp-header">
                        <svg width="14" height="14" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                            <path fill="#34A853" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.77-4.59l-7.98-6.19A23.99 23.99 0 000 24c0 3.77.9 7.35 2.56 10.52l7.97-5.93z"/>
                            <path fill="#FBBC05" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.93C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                        <span class="snel-seo-gp-header-label"><?php esc_html_e( 'Google Preview', 'snel-seo' ); ?></span>
                    </div>
                    <div class="snel-seo-gp-favicon-row">
                        <div class="snel-seo-gp-favicon">
                            <?php if ( $favicon ) : ?>
                                <img src="<?php echo esc_url( $favicon ); ?>" alt="">
                            <?php else : ?>
                                <div style="width:16px;height:16px;background:#ddd;border-radius:2px;"></div>
                            <?php endif; ?>
                        </div>
                        <div>
                            <div class="snel-seo-gp-domain"><?php echo esc_html( $domain ); ?></div>
                            <?php if ( $url_path ) : ?>
                                <div class="snel-seo-gp-path"><?php echo esc_html( $url_path ); ?></div>
                            <?php endif; ?>
                        </div>
                    </div>
                    <div class="snel-seo-gp-title"><?php echo esc_html( $preview_title ); ?></div>
                    <p class="snel-seo-gp-desc"><?php echo esc_html( $preview_desc ?: __( 'Auto-generated from your product description fields and templates.', 'snel-seo' ) ); ?></p>
                </div>
            </div>
            <?php endforeach; ?>
        </div>

        <!-- Custom SEO Tab -->
        <div class="snel-seo-tab-panel" data-tab="custom-seo">
            <div class="snel-seo-info-box amber">
                <?php esc_html_e( 'These fields are optional overrides. If left empty, your SEO templates and product fields will be used automatically.', 'snel-seo' ); ?>
            </div>

            <?php if ( $multilingual ) : ?>
            <div class="snel-seo-lang-switcher">
                <?php foreach ( $languages as $lang ) :
                    $code = $lang['code'];
                    $has_title = ! empty( $seo_titles[ $code ] );
                    $has_desc  = ! empty( $seo_descs[ $code ] );
                    $dot_class = '';
                    if ( ! $lang['default'] ) {
                        if ( $has_title && $has_desc ) $dot_class = 'snel-seo-dot-green';
                        elseif ( $has_title || $has_desc ) $dot_class = 'snel-seo-dot-amber';
                        else $dot_class = 'snel-seo-dot-gray';
                    }
                ?>
                    <button type="button"
                        class="snel-seo-lang-btn<?php echo $code === $default_lang ? ' active' : ''; ?>"
                        data-lang="<?php echo esc_attr( $code ); ?>">
                        <?php echo esc_html( $lang['label'] ); ?>
                        <?php if ( $lang['default'] ) : ?>
                            <span style="font-size:10px;">(<?php esc_html_e( 'default', 'snel-seo' ); ?>)</span>
                        <?php endif; ?>
                        <?php if ( $dot_class ) : ?>
                            <span class="snel-seo-dot <?php echo esc_attr( $dot_class ); ?>"></span>
                        <?php endif; ?>
                    </button>
                <?php endforeach; ?>

                <button type="button" class="button snel-seo-translate-all" id="snel-seo-translate-all-btn">
                    &#10022; <span id="snel-seo-translate-all-label"><?php esc_html_e( 'Translate All', 'snel-seo' ); ?></span>
                </button>
                <span class="snel-seo-translate-status" id="snel-seo-translate-status"></span>
            </div>
            <?php endif; ?>

            <?php foreach ( $languages as $lang ) :
                $code  = $lang['code'];
                $title = isset( $seo_titles[ $code ] ) ? $seo_titles[ $code ] : '';
                $desc  = isset( $seo_descs[ $code ] ) ? $seo_descs[ $code ] : '';
                $is_active = ( $code === $default_lang );

                $preview_title = ( $title ?: $post->post_title ) . ' ' . $separator . ' ' . $site_name;
            ?>
            <div class="snel-seo-lang-panel <?php echo $is_active ? 'active' : ''; ?>" data-lang="<?php echo esc_attr( $code ); ?>" <?php echo $is_active ? '' : 'style="display:none;"'; ?>>

                <div class="snel-seo-field">
                    <label>
                        <?php esc_html_e( 'SEO Title Override', 'snel-seo' ); ?>
                        <?php if ( $multilingual ) echo '(' . strtoupper( $code ) . ')'; ?>
                    </label>
                    <p class="description" style="font-size:11px;color:#888;margin:2px 0 6px;">
                        <?php esc_html_e( 'Leave empty to use the template.', 'snel-seo' ); ?>
                        <a href="<?php echo esc_url( admin_url( 'admin.php?page=snel-seo' ) ); ?>" target="_blank"><?php esc_html_e( 'Change template', 'snel-seo' ); ?></a>
                    </p>
                    <input type="text"
                        name="snel_seo_title[<?php echo esc_attr( $code ); ?>]"
                        value="<?php echo esc_attr( $title ); ?>"
                        class="snel-seo-title-input large-text"
                        data-lang="<?php echo esc_attr( $code ); ?>"
                        placeholder="<?php echo esc_attr( $post->post_title ); ?>">
                </div>

                <div class="snel-seo-field">
                    <label>
                        <?php esc_html_e( 'Meta Description Override', 'snel-seo' ); ?>
                        <?php if ( $multilingual ) echo '(' . strtoupper( $code ) . ')'; ?>
                    </label>
                    <p class="description" style="font-size:11px;color:#888;margin:2px 0 6px;">
                        <?php esc_html_e( 'Leave empty to use product fields and templates.', 'snel-seo' ); ?>
                    </p>
                    <textarea
                        name="snel_seo_metadesc[<?php echo esc_attr( $code ); ?>]"
                        rows="3"
                        class="snel-seo-desc-input large-text"
                        data-lang="<?php echo esc_attr( $code ); ?>"
                        maxlength="320"
                        placeholder="<?php esc_attr_e( 'Only fill this in to override the auto-generated description...', 'snel-seo' ); ?>"><?php echo esc_textarea( $desc ); ?></textarea>
                    <div class="snel-seo-char-count" data-lang="<?php echo esc_attr( $code ); ?>">
                        <span class="snel-seo-char-num"><?php echo mb_strlen( $desc ); ?></span> / 160
                    </div>
                </div>

                <!-- Live Google Preview in Custom SEO tab -->
                <div class="snel-seo-gp" data-lang="<?php echo esc_attr( $code ); ?>">
                    <div class="snel-seo-gp-header">
                        <svg width="14" height="14" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                            <path fill="#34A853" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.77-4.59l-7.98-6.19A23.99 23.99 0 000 24c0 3.77.9 7.35 2.56 10.52l7.97-5.93z"/>
                            <path fill="#FBBC05" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.93C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                        <span class="snel-seo-gp-header-label"><?php esc_html_e( 'Google Preview', 'snel-seo' ); ?></span>
                    </div>
                    <div class="snel-seo-gp-favicon-row">
                        <div class="snel-seo-gp-favicon">
                            <?php if ( $favicon ) : ?>
                                <img src="<?php echo esc_url( $favicon ); ?>" alt="">
                            <?php else : ?>
                                <div style="width:16px;height:16px;background:#ddd;border-radius:2px;"></div>
                            <?php endif; ?>
                        </div>
                        <div>
                            <div class="snel-seo-gp-domain"><?php echo esc_html( $domain ); ?></div>
                        </div>
                    </div>
                    <div class="snel-seo-gp-title"><?php echo esc_html( $preview_title ); ?></div>
                    <p class="snel-seo-gp-desc"><?php echo esc_html( $desc ?: __( 'No override set — using auto-generated description.', 'snel-seo' ) ); ?></p>
                </div>

            </div>
            <?php endforeach; ?>
        </div>
    </div>

    <script>
    (function(){
        var defaultLang = '<?php echo esc_js( $default_lang ); ?>';
        var currentLang = defaultLang;
        var postTitle = (document.getElementById('title') || {}).value || '<?php echo esc_js( $post->post_title ); ?>';
        var siteName = '<?php echo esc_js( $site_name ); ?>';
        var separator = '<?php echo esc_js( $separator ); ?>';
        var restUrl = '<?php echo esc_js( $rest_url ); ?>';
        var nonce = '<?php echo esc_js( $nonce ); ?>';
        var postId = <?php echo (int) $post->ID; ?>;
        var languages = <?php echo wp_json_encode( array_map( function( $l ) { return $l['code']; }, $languages ) ); ?>;

        // Listen for title changes.
        var wpTitle = document.getElementById('title');
        if (wpTitle) {
            wpTitle.addEventListener('input', function() {
                postTitle = this.value;
                updatePreviews();
            });
        }

        // Tab switching.
        var tabBtns = document.querySelectorAll('.snel-seo-classic .snel-seo-tab');
        var tabPanels = document.querySelectorAll('.snel-seo-classic .snel-seo-tab-panel');
        tabBtns.forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                var tab = this.dataset.tab;
                tabBtns.forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                tabPanels.forEach(function(p) {
                    if (p.dataset.tab === tab) {
                        p.classList.add('active');
                    } else {
                        p.classList.remove('active');
                    }
                });
                // Sync language panels in the newly visible tab.
                syncLangPanels();
            });
        });

        // Language switcher — all lang buttons across both tabs.
        var allLangBtns = document.querySelectorAll('.snel-seo-classic .snel-seo-lang-btn');
        var langBtns = allLangBtns;
        var langPanels = document.querySelectorAll('.snel-seo-classic .snel-seo-lang-panel');
        var langPanelsPreview = document.querySelectorAll('.snel-seo-classic .snel-seo-lang-panel-preview');

        function syncLangPanels() {
            // Sync both custom SEO and preview panels to currentLang.
            langPanels.forEach(function(p) {
                p.style.display = p.dataset.lang === currentLang ? '' : 'none';
            });
            langPanelsPreview.forEach(function(p) {
                p.style.display = p.dataset.lang === currentLang ? '' : 'none';
            });
        }

        function updateTranslateLabel() {
            var label = document.getElementById('snel-seo-translate-all-label');
            if (!label) return;
            if (currentLang === defaultLang) {
                label.textContent = '<?php echo esc_js( __( 'Translate All', 'snel-seo' ) ); ?>';
            } else {
                label.textContent = '<?php echo esc_js( __( 'Translate All for', 'snel-seo' ) ); ?> ' + currentLang.toUpperCase();
            }
        }

        allLangBtns.forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                currentLang = this.dataset.lang;
                // Sync active state across all lang buttons in both tabs.
                allLangBtns.forEach(function(b) {
                    if (b.dataset.lang === currentLang) b.classList.add('active');
                    else b.classList.remove('active');
                });
                syncLangPanels();
                updateTranslateLabel();
            });
        });

        // Character counters + live preview.
        document.querySelectorAll('.snel-seo-classic .snel-seo-desc-input').forEach(function(textarea) {
            textarea.addEventListener('input', function() {
                var count = this.value.length;
                var counter = document.querySelector('.snel-seo-char-count[data-lang="' + this.dataset.lang + '"]');
                if (counter) {
                    counter.querySelector('.snel-seo-char-num').textContent = count;
                    counter.classList.toggle('over', count > 160);
                }
                updatePreviews();
                updateDots();
            });
        });

        document.querySelectorAll('.snel-seo-classic .snel-seo-title-input').forEach(function(input) {
            input.addEventListener('input', function() {
                updatePreviews();
                updateDots();
            });
        });

        function updatePreviews() {
            languages.forEach(function(lang) {
                var titleInput = document.querySelector('.snel-seo-title-input[data-lang="' + lang + '"]');
                var descInput = document.querySelector('.snel-seo-desc-input[data-lang="' + lang + '"]');
                var titleVal = titleInput ? titleInput.value : '';
                var descVal = descInput ? descInput.value : '';

                var displayTitle = (titleVal || postTitle) + ' ' + separator + ' ' + siteName;
                var displayDesc = descVal || 'No meta description set. Google will auto-generate a snippet from your page content.';

                // Google Preview
                var gp = document.querySelector('.snel-seo-gp[data-lang="' + lang + '"]');
                if (gp) {
                    gp.querySelector('.snel-seo-gp-title').textContent = displayTitle;
                    gp.querySelector('.snel-seo-gp-desc').textContent = displayDesc;
                }

            });
        }

        function updateDots() {
            langBtns.forEach(function(btn) {
                var lang = btn.dataset.lang;
                if (lang === defaultLang) return;

                var titleInput = document.querySelector('.snel-seo-title-input[data-lang="' + lang + '"]');
                var descInput = document.querySelector('.snel-seo-desc-input[data-lang="' + lang + '"]');
                var hasTitle = titleInput && titleInput.value.trim();
                var hasDesc = descInput && descInput.value.trim();

                var dot = btn.querySelector('.snel-seo-dot');
                if (!dot) {
                    dot = document.createElement('span');
                    dot.className = 'snel-seo-dot';
                    btn.appendChild(dot);
                }

                dot.className = 'snel-seo-dot';
                if (hasTitle && hasDesc) {
                    dot.classList.add('snel-seo-dot-green');
                } else if (hasTitle || hasDesc) {
                    dot.classList.add('snel-seo-dot-amber');
                } else {
                    dot.classList.add('snel-seo-dot-gray');
                }
            });
        }

        // Translate All.
        var translateBtn = document.getElementById('snel-seo-translate-all-btn');
        var translateStatus = document.getElementById('snel-seo-translate-status');

        if (translateBtn) {
            translateBtn.addEventListener('click', function(e) {
                e.preventDefault();

                var defaultTitle = document.querySelector('.snel-seo-title-input[data-lang="' + defaultLang + '"]');
                var defaultDesc = document.querySelector('.snel-seo-desc-input[data-lang="' + defaultLang + '"]');
                var srcTitle = defaultTitle ? defaultTitle.value.trim() : '';
                var srcDesc = defaultDesc ? defaultDesc.value.trim() : '';

                if (!srcTitle && !srcDesc && !postTitle) {
                    translateStatus.textContent = 'Fill in the default language first.';
                    return;
                }
                if (!srcTitle) srcTitle = postTitle;

                translateBtn.disabled = true;
                var otherLangs = currentLang === defaultLang
                    ? languages.filter(function(l) { return l !== defaultLang; })
                    : [currentLang];
                var idx = 0;

                function translateNext() {
                    if (idx >= otherLangs.length) {
                        translateStatus.textContent = 'All done \u2713';
                        translateBtn.disabled = false;
                        setTimeout(function() { translateStatus.textContent = ''; }, 2000);
                        return;
                    }

                    var lang = otherLangs[idx];
                    translateStatus.textContent = '\u2726 Translating ' + lang.toUpperCase() + '...';

                    var promises = [];

                    if (srcTitle) {
                        promises.push(
                            fetch(restUrl + '/settings/translate', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
                                body: JSON.stringify({ text: srcTitle, lang: lang, type: 'title' })
                            }).then(function(r) { return r.json(); }).then(function(data) {
                                if (data.result) {
                                    var el = document.querySelector('.snel-seo-title-input[data-lang="' + lang + '"]');
                                    if (el) el.value = data.result;
                                }
                            })
                        );
                    }

                    if (srcDesc) {
                        promises.push(
                            fetch(restUrl + '/settings/translate', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
                                body: JSON.stringify({ text: srcDesc, lang: lang, type: 'description' })
                            }).then(function(r) { return r.json(); }).then(function(data) {
                                if (data.result) {
                                    var el = document.querySelector('.snel-seo-desc-input[data-lang="' + lang + '"]');
                                    if (el) el.value = data.result;
                                }
                            })
                        );
                    }

                    Promise.all(promises).then(function() {
                        updatePreviews();
                        updateDots();
                        idx++;
                        translateNext();
                    }).catch(function() {
                        idx++;
                        translateNext();
                    });
                }

                translateNext();
            });
        }
    })();
    </script>
    <?php
}

/**
 * Save classic meta box SEO fields on post save.
 */
function snel_seo_classic_metabox_save( $post_id ) {
    if ( ! isset( $_POST['snel_seo_classic_nonce'] ) ) return;
    if ( ! wp_verify_nonce( $_POST['snel_seo_classic_nonce'], 'snel_seo_classic_metabox' ) ) return;
    if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;
    if ( ! current_user_can( 'edit_post', $post_id ) ) return;

    if ( isset( $_POST['snel_seo_title'] ) && is_array( $_POST['snel_seo_title'] ) ) {
        $titles = array();
        foreach ( $_POST['snel_seo_title'] as $lang => $val ) {
            $titles[ sanitize_key( $lang ) ] = sanitize_text_field( wp_unslash( $val ) );
        }
        update_post_meta( $post_id, '_snel_seo_title', wp_json_encode( $titles ) );
    }

    if ( isset( $_POST['snel_seo_metadesc'] ) && is_array( $_POST['snel_seo_metadesc'] ) ) {
        $descs = array();
        foreach ( $_POST['snel_seo_metadesc'] as $lang => $val ) {
            $descs[ sanitize_key( $lang ) ] = sanitize_text_field( wp_unslash( $val ) );
        }
        update_post_meta( $post_id, '_snel_seo_metadesc', wp_json_encode( $descs ) );
    }
}
add_action( 'save_post', 'snel_seo_classic_metabox_save' );
