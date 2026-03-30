<?php
/**
 * Tests for tag extraction and restoration in snel_seo_translate_text().
 *
 * These tests cover the core logic: extracting %%tags%%, replacing with
 * placeholders, and restoring them after translation. They do NOT call
 * OpenAI — they test the extract/restore functions directly.
 */

use PHPUnit\Framework\TestCase;

class TranslateTagsTest extends TestCase {

    // ── Extraction ─────────────────────────────────────────────────────

    public function test_extracts_single_tag() {
        $result = snel_seo_extract_tags( '%%sitename%%' );

        $this->assertEquals( '[1]', $result['cleaned'] );
        $this->assertEquals( array( 1 => '%%sitename%%' ), $result['tags'] );
        $this->assertFalse( $result['has_text'] );
    }

    public function test_extracts_multiple_tags() {
        $result = snel_seo_extract_tags( '%%title%% %%separator%% %%sitename%%' );

        $this->assertEquals( '[1] [2] [3]', $result['cleaned'] );
        $this->assertEquals( array(
            1 => '%%title%%',
            2 => '%%separator%%',
            3 => '%%sitename%%',
        ), $result['tags'] );
        $this->assertFalse( $result['has_text'] );
    }

    public function test_extracts_tags_with_text_between() {
        $result = snel_seo_extract_tags( 'Beste %%title%% diensten %%separator%% %%sitename%%' );

        $this->assertEquals( 'Beste [1] diensten [2] [3]', $result['cleaned'] );
        $this->assertTrue( $result['has_text'] );
    }

    public function test_no_tags_returns_plain_text() {
        $result = snel_seo_extract_tags( 'Just a plain title with no tags' );

        $this->assertEquals( 'Just a plain title with no tags', $result['cleaned'] );
        $this->assertEmpty( $result['tags'] );
        $this->assertTrue( $result['has_text'] );
    }

    public function test_empty_string() {
        $result = snel_seo_extract_tags( '' );

        $this->assertEquals( '', $result['cleaned'] );
        $this->assertEmpty( $result['tags'] );
        $this->assertFalse( $result['has_text'] );
    }

    public function test_only_tags_no_text_has_text_is_false() {
        $result = snel_seo_extract_tags( '%%sitename%% %%separator%% %%sitedesc%%' );

        $this->assertFalse( $result['has_text'] );
    }

    public function test_text_around_tags_has_text_is_true() {
        $result = snel_seo_extract_tags( 'Welkom bij %%sitename%%' );

        $this->assertTrue( $result['has_text'] );
    }

    public function test_preserves_tag_with_underscores() {
        $result = snel_seo_extract_tags( '%%custom_tag%% test' );

        $this->assertEquals( '[1] test', $result['cleaned'] );
        $this->assertEquals( array( 1 => '%%custom_tag%%' ), $result['tags'] );
    }

    // ── Restoration ────────────────────────────────────────────────────

    public function test_restores_single_tag() {
        $tags = array( 1 => '%%sitename%%' );
        $result = snel_seo_restore_tags( '[1]', $tags );

        $this->assertEquals( '%%sitename%%', $result );
    }

    public function test_restores_multiple_tags() {
        $tags = array(
            1 => '%%title%%',
            2 => '%%separator%%',
            3 => '%%sitename%%',
        );
        $result = snel_seo_restore_tags( '[1] [2] [3]', $tags );

        $this->assertEquals( '%%title%% %%separator%% %%sitename%%', $result );
    }

    public function test_restores_tags_with_translated_text() {
        $tags = array(
            1 => '%%title%%',
            2 => '%%separator%%',
            3 => '%%sitename%%',
        );
        $result = snel_seo_restore_tags( 'Best [1] services [2] [3]', $tags );

        $this->assertEquals( 'Best %%title%% services %%separator%% %%sitename%%', $result );
    }

    public function test_restores_with_reordered_tags() {
        // Some languages might change word order, but tags should still restore.
        $tags = array(
            1 => '%%sitename%%',
            2 => '%%separator%%',
            3 => '%%title%%',
        );
        $result = snel_seo_restore_tags( '[3] [2] [1]', $tags );

        $this->assertEquals( '%%title%% %%separator%% %%sitename%%', $result );
    }

    public function test_no_tags_returns_text_as_is() {
        $result = snel_seo_restore_tags( 'Plain translated text', array() );

        $this->assertEquals( 'Plain translated text', $result );
    }

    // ── Round-trip ─────────────────────────────────────────────────────

    public function test_roundtrip_extract_then_restore() {
        $original = 'Beste %%title%% diensten %%separator%% %%sitename%%';
        $extracted = snel_seo_extract_tags( $original );

        // Simulate AI translating only the text parts.
        $translated = str_replace( 'Beste', 'Best', $extracted['cleaned'] );
        $translated = str_replace( 'diensten', 'services', $translated );

        $result = snel_seo_restore_tags( $translated, $extracted['tags'] );

        $this->assertEquals( 'Best %%title%% services %%separator%% %%sitename%%', $result );
    }

    public function test_roundtrip_tags_only_returns_original() {
        $original = '%%title%% %%separator%% %%sitename%%';
        $extracted = snel_seo_extract_tags( $original );

        // No text to translate, so has_text is false.
        $this->assertFalse( $extracted['has_text'] );

        // Restoring should give back original.
        $result = snel_seo_restore_tags( $extracted['cleaned'], $extracted['tags'] );
        $this->assertEquals( $original, $result );
    }

    public function test_roundtrip_plain_text_no_tags() {
        $original = 'Professionele drone diensten en advies';
        $extracted = snel_seo_extract_tags( $original );

        $this->assertTrue( $extracted['has_text'] );
        $this->assertEmpty( $extracted['tags'] );

        // Simulate translation.
        $translated = 'Professional drone services and consultancy';
        $result = snel_seo_restore_tags( $translated, $extracted['tags'] );

        $this->assertEquals( $translated, $result );
    }

    public function test_roundtrip_description_with_sitedesc() {
        $original = 'Ontdek %%sitename%% — %%sitedesc%%. Neem contact op!';
        $extracted = snel_seo_extract_tags( $original );

        $this->assertTrue( $extracted['has_text'] );
        $this->assertCount( 2, $extracted['tags'] );

        // Simulate translation.
        $translated = 'Discover [1] — [2]. Contact us!';
        $result = snel_seo_restore_tags( $translated, $extracted['tags'] );

        $this->assertEquals( 'Discover %%sitename%% — %%sitedesc%%. Contact us!', $result );
    }
}
