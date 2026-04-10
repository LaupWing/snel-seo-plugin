<?php
/**
 * Plugin Name: Snel SEO
 * Description: Lightweight SEO toolkit by Snelstack. Yoast-compatible, zero bloat.
 * Version: 1.16.1
 * Author: Snelstack
 * Author URI: https://snelstack.com
 * License: GPL v2 or later
 * Text Domain: snel-seo
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'SNEL_SEO_VERSION', '1.16.1' );
define( 'SNEL_SEO_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'SNEL_SEO_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Auto-updater — checks GitHub releases for new versions.
require_once SNEL_SEO_PLUGIN_DIR . 'vendor/autoload.php';

use YahnisElsts\PluginUpdateChecker\v5\PucFactory;

$snel_seo_updater = PucFactory::buildUpdateChecker(
    'https://github.com/LaupWing/snel-seo-plugin/',
    __FILE__,
    'snel-seo'
);
$snel_seo_updater->setAuthentication( defined( 'SNEL_SEO_GITHUB_TOKEN' ) ? constant( 'SNEL_SEO_GITHUB_TOKEN' ) : '' );
/** @var \YahnisElsts\PluginUpdateChecker\v5p5\Vcs\GitHubApi $api */
$api = $snel_seo_updater->getVcsApi();
$api->enableReleaseAssets();

// Load modules.
require_once SNEL_SEO_PLUGIN_DIR . 'inc/config.php';
require_once SNEL_SEO_PLUGIN_DIR . 'inc/languages.php';
require_once SNEL_SEO_PLUGIN_DIR . 'inc/translate.php';
require_once SNEL_SEO_PLUGIN_DIR . 'inc/redirects.php';
require_once SNEL_SEO_PLUGIN_DIR . 'inc/head-output.php';
require_once SNEL_SEO_PLUGIN_DIR . 'inc/robots.php';
require_once SNEL_SEO_PLUGIN_DIR . 'inc/sitemap.php';
require_once SNEL_SEO_PLUGIN_DIR . 'inc/admin.php';
require_once SNEL_SEO_PLUGIN_DIR . 'inc/meta-box.php';
require_once SNEL_SEO_PLUGIN_DIR . 'inc/rest-api.php';
require_once SNEL_SEO_PLUGIN_DIR . 'inc/scanner.php';
require_once SNEL_SEO_PLUGIN_DIR . 'inc/admin-bar.php';

// Activation hook.
register_activation_hook( __FILE__, 'snel_seo_create_redirects_table' );
register_activation_hook( __FILE__, 'snel_seo_create_404_log_table' );
