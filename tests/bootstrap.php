<?php
/**
 * PHPUnit bootstrap — loads only what's needed for unit tests.
 *
 * These are pure unit tests that do NOT require WordPress.
 * We stub only the minimal WP functions that our code calls.
 */

// Define ABSPATH so inc/ files load.
if ( ! defined( 'ABSPATH' ) ) {
    define( 'ABSPATH', '/tmp/' );
}

// Stub WP_Error for tests that check error returns.
if ( ! class_exists( 'WP_Error' ) ) {
    class WP_Error {
        public $code;
        public $message;
        public $data;

        public function __construct( $code = '', $message = '', $data = '' ) {
            $this->code    = $code;
            $this->message = $message;
            $this->data    = $data;
        }

        public function get_error_code() {
            return $this->code;
        }

        public function get_error_message() {
            return $this->message;
        }
    }
}

// Stub SnelSeoConfig for tests that need config values.
if ( ! class_exists( 'SnelSeoConfig' ) ) {
    class SnelSeoConfig {
        public static $max_title_length = 60;
        public static $max_desc_length  = 160;
        public static $ai_api_url       = 'https://api.openai.com/v1/chat/completions';
        public static $ai_temp_translation = 0.3;

        public static function ai_key() {
            return 'test-key';
        }

        public static function ai_model() {
            return 'gpt-4o-mini';
        }

        public static function lang_name( $code ) {
            $names = array( 'nl' => 'Dutch', 'en' => 'English', 'de' => 'German', 'fr' => 'French', 'es' => 'Spanish' );
            return $names[ $code ] ?? $code;
        }
    }
}

// Load the translate module (the code we're testing).
require_once dirname( __DIR__ ) . '/inc/translate.php';
