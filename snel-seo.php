<?php
/**
 * Plugin Name: Snel SEO
 * Description: Lightweight SEO toolkit by Snelstack. Yoast-compatible, zero bloat.
 * Version: 1.0.0
 * Author: Snelstack
 * Author URI: https://snelstack.com
 * License: GPL v2 or later
 * Text Domain: snel-seo
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'SNEL_SEO_VERSION', '1.0.0' );
define( 'SNEL_SEO_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'SNEL_SEO_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Load modules.
require_once SNEL_SEO_PLUGIN_DIR . 'inc/languages.php';
require_once SNEL_SEO_PLUGIN_DIR . 'inc/redirects.php';
require_once SNEL_SEO_PLUGIN_DIR . 'inc/head-output.php';
require_once SNEL_SEO_PLUGIN_DIR . 'inc/robots.php';
require_once SNEL_SEO_PLUGIN_DIR . 'inc/admin.php';
require_once SNEL_SEO_PLUGIN_DIR . 'inc/meta-box.php';
require_once SNEL_SEO_PLUGIN_DIR . 'inc/rest-api.php';

// Activation hook.
register_activation_hook( __FILE__, 'snel_seo_create_redirects_table' );
