<?php
/**
 * Admin Bar — SEO score indicator on frontend.
 *
 * Shows a colored circle in the WP admin bar when viewing the site.
 * Click to open a popover with scan controls and results.
 *
 * @package SnelSEO
 */

defined( 'ABSPATH' ) || exit;

/**
 * Add Snel SEO node to the admin bar.
 */
add_action( 'admin_bar_menu', function ( $wp_admin_bar ) {
    // Only show on frontend for users who can manage options.
    if ( is_admin() || ! current_user_can( 'manage_options' ) ) {
        return;
    }

    $wp_admin_bar->add_node( array(
        'id'    => 'snel-seo-bar',
        'title' => '<span id="snel-seo-bar-indicator" style="display:inline-flex;align-items:center;gap:6px;">'
                 . '<span id="snel-seo-bar-circle" style="position:relative;width:10px;height:10px;display:inline-block;">'
                 . '<span style="position:absolute;inset:0;border-radius:50%;background:#9ca3af;animation:snelSeoBarPulse 2s ease-in-out infinite;"></span>'
                 . '<span id="snel-seo-bar-circle-inner" style="position:relative;width:10px;height:10px;border-radius:50%;background:#9ca3af;display:block;transition:background 0.3s;"></span>'
                 . '</span>'
                 . '<span style="font-size:13px;">Snel <em style="font-family:Georgia,serif;font-style:italic;">SEO</em></span>'
                 . '</span>',
        'href'  => '#',
        'meta'  => array(
            'onclick' => 'event.preventDefault(); document.getElementById("snel-seo-popover").classList.toggle("snel-seo-popover-open"); return false;',
        ),
    ) );
}, 100 );

/**
 * Enqueue admin bar styles and popover markup on frontend.
 */
add_action( 'wp_footer', function () {
    if ( is_admin() || ! current_user_can( 'manage_options' ) || ! is_admin_bar_showing() ) {
        return;
    }

    // Get current object info.
    $object_type = '';
    $object_id   = 0;
    $lang        = snel_seo_get_current_lang();
    if ( is_singular() ) {
        $object_type = 'post';
        $object_id   = get_queried_object_id();
    } elseif ( is_tax() || is_category() || is_tag() ) {
        $object_type = 'term';
        $object_id   = get_queried_object_id();
    }
    ?>
    <style>
        @keyframes snelSeoBarPulse {
            0% { opacity: 0.6; transform: scale(1); }
            100% { opacity: 0; transform: scale(1.6); }
        }
        #snel-seo-popover {
            display: none;
            position: fixed;
            top: 32px;
            right: 16px;
            z-index: 100001;
            width: 340px;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            overflow: hidden;
            animation: snelSeoSlideDown 0.2s ease-out;
        }
        #snel-seo-popover.snel-seo-popover-open {
            display: block;
        }
        @keyframes snelSeoSlideDown {
            from { opacity: 0; transform: translateY(-8px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        .snel-seo-pop-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 16px;
            border-bottom: 1px solid #e5e7eb;
            background: #f9fafb;
        }
        .snel-seo-pop-header h3 {
            font-size: 13px;
            font-weight: 600;
            color: #111827;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .snel-seo-pop-close {
            background: none;
            border: none;
            cursor: pointer;
            color: #9ca3af;
            padding: 2px;
            line-height: 1;
            font-size: 18px;
        }
        .snel-seo-pop-close:hover { color: #374151; }
        .snel-seo-pop-body {
            padding: 16px;
        }
        .snel-seo-pop-score {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 14px;
        }
        .snel-seo-pop-score-circle {
            width: 48px;
            height: 48px;
            min-width: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 700;
            background: #f3f4f6;
            color: #9ca3af;
            transition: all 0.3s;
            flex-shrink: 0;
        }
        .snel-seo-pop-score-circle.good { background: #ecfdf5; color: #059669; }
        .snel-seo-pop-score-circle.warning { background: #fffbeb; color: #d97706; }
        .snel-seo-pop-score-circle.error { background: #fef2f2; color: #dc2626; }
        .snel-seo-pop-score-label {
            font-size: 12px;
            color: #6b7280;
        }
        .snel-seo-pop-score-label strong {
            display: block;
            font-size: 13px;
            color: #111827;
        }
        .snel-seo-pop-checks {
            list-style: none;
            margin: 0;
            padding: 0;
        }
        .snel-seo-pop-checks li {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 7px 0;
            border-bottom: 1px solid #f3f4f6;
            font-size: 12px;
            color: #374151;
        }
        .snel-seo-pop-checks li:last-child { border-bottom: none; }
        .snel-seo-pop-check-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        .snel-seo-pop-check-dot.ok { background: #10b981; }
        .snel-seo-pop-check-dot.warning { background: #f59e0b; }
        .snel-seo-pop-check-dot.error { background: #ef4444; }
        .snel-seo-pop-check-dot.pending { background: #d1d5db; }
        .snel-seo-pop-check-label {
            font-weight: 500;
            width: 110px;
            flex-shrink: 0;
        }
        .snel-seo-pop-check-msg {
            color: #6b7280;
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .snel-seo-pop-status {
            height: 20px;
            overflow: hidden;
            margin-bottom: 12px;
        }
        .snel-seo-pop-status-text {
            font-size: 11px;
            font-weight: 500;
            transition: all 0.15s ease-out;
        }
        .snel-seo-pop-status-text.scanning { color: #7c3aed; }
        .snel-seo-pop-status-text.done { color: #059669; }
        .snel-seo-pop-status-text.error { color: #dc2626; }
        .snel-seo-pop-footer {
            padding: 12px 16px;
            border-top: 1px solid #e5e7eb;
            background: #f9fafb;
        }
        .snel-seo-pop-scan-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            width: 100%;
            padding: 8px 16px;
            font-size: 12px;
            font-weight: 600;
            color: #fff;
            background: #7c3aed;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .snel-seo-pop-scan-btn:hover { background: #6d28d9; }
        .snel-seo-pop-scan-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .snel-seo-pop-scan-btn svg {
            animation: none;
        }
        .snel-seo-pop-scan-btn.scanning svg {
            animation: snelSeoSpin 1s linear infinite;
        }
        @keyframes snelSeoSpin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
        }
        .snel-seo-pop-empty {
            text-align: center;
            padding: 20px 0;
            color: #9ca3af;
            font-size: 12px;
        }
        .snel-seo-pop-empty svg {
            margin: 0 auto 8px;
            opacity: 0.4;
        }
        .snel-seo-pop-summary {
            font-size: 11px;
            color: #6b7280;
            font-style: italic;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #f3f4f6;
        }
    </style>

    <div id="snel-seo-popover">
        <div class="snel-seo-pop-header">
            <h3>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                Snel <em style="font-family:Georgia,serif;font-style:italic;font-weight:400;">SEO</em>
                <span style="font-size:10px;font-weight:400;color:#9ca3af;margin-left:2px;"><?php echo esc_html( SNEL_SEO_VERSION ); ?></span>
            </h3>
            <button class="snel-seo-pop-close" onclick="document.getElementById('snel-seo-popover').classList.remove('snel-seo-popover-open');">&times;</button>
        </div>

        <div class="snel-seo-pop-body">
            <!-- Status text (animated during scan) -->
            <div class="snel-seo-pop-status" id="snel-seo-pop-status" style="display:none;">
                <span class="snel-seo-pop-status-text scanning" id="snel-seo-pop-status-text"></span>
            </div>

            <!-- Score + checks (hidden until scanned) -->
            <div id="snel-seo-pop-result" style="display:none;">
                <div class="snel-seo-pop-score">
                    <div class="snel-seo-pop-score-circle" id="snel-seo-pop-score-circle">—</div>
                    <div class="snel-seo-pop-score-label">
                        <strong id="snel-seo-pop-score-label">Not scanned</strong>
                        <span id="snel-seo-pop-score-sublabel">Click scan to analyze this page</span>
                    </div>
                </div>
                <ul class="snel-seo-pop-checks" id="snel-seo-pop-checks">
                    <li>
                        <span class="snel-seo-pop-check-dot pending"></span>
                        <span class="snel-seo-pop-check-label">Title</span>
                        <span class="snel-seo-pop-check-msg">—</span>
                    </li>
                    <li>
                        <span class="snel-seo-pop-check-dot pending"></span>
                        <span class="snel-seo-pop-check-label">Meta Description</span>
                        <span class="snel-seo-pop-check-msg">—</span>
                    </li>
                    <li>
                        <span class="snel-seo-pop-check-dot pending"></span>
                        <span class="snel-seo-pop-check-label">H1</span>
                        <span class="snel-seo-pop-check-msg">—</span>
                    </li>
                    <li>
                        <span class="snel-seo-pop-check-dot pending"></span>
                        <span class="snel-seo-pop-check-label">Content Language</span>
                        <span class="snel-seo-pop-check-msg">—</span>
                    </li>
                    <li>
                        <span class="snel-seo-pop-check-dot pending"></span>
                        <span class="snel-seo-pop-check-label">Desc Relevance</span>
                        <span class="snel-seo-pop-check-msg">—</span>
                    </li>
                </ul>
                <div class="snel-seo-pop-summary" id="snel-seo-pop-summary" style="display:none;"></div>
            </div>

            <!-- Empty state (shown by default) -->
            <div class="snel-seo-pop-empty" id="snel-seo-pop-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <p style="margin:0;">No scan data for this page yet.</p>
                <p style="margin:4px 0 0;font-size:11px;">Click the button below to scan.</p>
            </div>
        </div>

        <div class="snel-seo-pop-footer">
            <button class="snel-seo-pop-scan-btn" id="snel-seo-pop-scan-btn" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span id="snel-seo-pop-scan-btn-text">Scan This Page</span>
            </button>
        </div>
    </div>

    <script>
    (function() {
        var objectType = <?php echo wp_json_encode( $object_type ); ?>;
        var objectId = <?php echo (int) $object_id; ?>;
        var lang = <?php echo wp_json_encode( $lang ); ?>;
        var restUrl = <?php echo wp_json_encode( rest_url( SnelSeoConfig::$rest_namespace ) ); ?>;
        var nonce = <?php echo wp_json_encode( wp_create_nonce( 'wp_rest' ) ); ?>;

        // Position popover below the admin bar item.
        var barItemEl = document.getElementById('wp-admin-bar-snel-seo-bar');
        var popoverEl = document.getElementById('snel-seo-popover');
        if (barItemEl && popoverEl) {
            var positionPopover = function() {
                if (!popoverEl.classList.contains('snel-seo-popover-open')) return;
                var rect = barItemEl.getBoundingClientRect();
                popoverEl.style.top = rect.bottom + 'px';
                var popWidth = popoverEl.offsetWidth || 340;
                var center = rect.left + (rect.width / 2);
                var left = center - (popWidth / 2);
                if (left + popWidth > window.innerWidth - 8) left = window.innerWidth - popWidth - 8;
                if (left < 8) left = 8;
                popoverEl.style.left = left + 'px';
                popoverEl.style.right = 'auto';
            };
            var observer = new MutationObserver(positionPopover);
            observer.observe(popoverEl, { attributes: true, attributeFilter: ['class'] });
        }

        var checkLabels = { title: 'Title', meta_desc: 'Meta Description', h1: 'H1', content_lang: 'Content Language', desc_relevance: 'Desc Relevance' };
        var checkKeys = ['title', 'meta_desc', 'h1', 'content_lang', 'desc_relevance'];

        var scanBtn = document.getElementById('snel-seo-pop-scan-btn');
        var scanBtnText = document.getElementById('snel-seo-pop-scan-btn-text');
        var statusEl = document.getElementById('snel-seo-pop-status');
        var statusTextEl = document.getElementById('snel-seo-pop-status-text');
        var resultEl = document.getElementById('snel-seo-pop-result');
        var emptyEl = document.getElementById('snel-seo-pop-empty');
        var scoreCircle = document.getElementById('snel-seo-pop-score-circle');
        var scoreLabel = document.getElementById('snel-seo-pop-score-label');
        var scoreSublabel = document.getElementById('snel-seo-pop-score-sublabel');
        var checksEl = document.getElementById('snel-seo-pop-checks');
        var summaryEl = document.getElementById('snel-seo-pop-summary');
        var barCircle = document.getElementById('snel-seo-bar-circle');
        var barCircleInner = document.getElementById('snel-seo-bar-circle-inner');

        function setStatus(text, type) {
            statusEl.style.display = 'block';
            statusTextEl.className = 'snel-seo-pop-status-text ' + (type || 'scanning');
            statusTextEl.textContent = text;
        }

        function updateScore(score) {
            scoreCircle.textContent = score;
            scoreCircle.className = 'snel-seo-pop-score-circle ' + (score >= 80 ? 'good' : score >= 50 ? 'warning' : 'error');
            var color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
            barCircleInner.style.background = color;
            var outerRing = barCircle.querySelector('span:first-child');
            if (outerRing) outerRing.style.background = color;
        }

        function updateChecks(checks) {
            var items = checksEl.querySelectorAll('li');
            checkKeys.forEach(function(key, i) {
                var check = checks[key];
                if (!check || !items[i]) return;
                var dot = items[i].querySelector('.snel-seo-pop-check-dot');
                var msg = items[i].querySelector('.snel-seo-pop-check-msg');
                dot.className = 'snel-seo-pop-check-dot ' + check.status;
                msg.textContent = check.message;
                msg.title = check.message;
            });
        }

        function showResult(data) {
            emptyEl.style.display = 'none';
            resultEl.style.display = 'block';

            if (data.score !== undefined) {
                updateScore(data.score);
                scoreLabel.textContent = data.score >= 80 ? 'Good' : data.score >= 50 ? 'Needs Work' : 'Issues Found';
                scoreSublabel.textContent = lang.toUpperCase() + ' · ' + (data.url || window.location.href);
            }

            if (data.checks) {
                updateChecks(data.checks);
            }

            if (data.ai_summary || data.summary) {
                summaryEl.style.display = 'block';
                summaryEl.textContent = data.ai_summary || data.summary;
            }
        }

        // Close popover when clicking outside.
        document.addEventListener('click', function(e) {
            var popover = document.getElementById('snel-seo-popover');
            var barItem = document.getElementById('wp-admin-bar-snel-seo-bar');
            if (popover.classList.contains('snel-seo-popover-open') && !popover.contains(e.target) && (!barItem || !barItem.contains(e.target))) {
                popover.classList.remove('snel-seo-popover-open');
            }
        });

        if (!objectId || !objectType) {
            scanBtn.disabled = true;
            scanBtnText.textContent = 'Not a scannable page';
            return;
        }

        // Scan button click.
        scanBtn.addEventListener('click', function() {
            if (scanBtn.disabled) return;
            scanBtn.disabled = true;
            scanBtn.classList.add('scanning');
            scanBtnText.textContent = 'Scanning...';

            // Reset checks to pending.
            var items = checksEl.querySelectorAll('li');
            items.forEach(function(li) {
                li.querySelector('.snel-seo-pop-check-dot').className = 'snel-seo-pop-check-dot pending';
                li.querySelector('.snel-seo-pop-check-msg').textContent = '—';
            });
            summaryEl.style.display = 'none';

            emptyEl.style.display = 'none';
            resultEl.style.display = 'block';

            setStatus('⟳ Fetching ' + lang.toUpperCase() + ' page...', 'scanning');

            var batchBody = { languages: [lang] };
            if (objectType === 'term') { batchBody.term_ids = [objectId]; }
            else { batchBody.post_ids = [objectId]; }

            fetch(restUrl + '/scanner/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce },
                body: JSON.stringify(batchBody)
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                var result = data.results && data.results[0];
                if (!result) {
                    setStatus('✗ No result returned', 'error');
                    scanBtn.disabled = false;
                    scanBtn.classList.remove('scanning');
                    scanBtnText.textContent = 'Retry Scan';
                    return;
                }

                if (result.error) {
                    setStatus('✗ ' + result.error, 'error');
                    scanBtn.disabled = false;
                    scanBtn.classList.remove('scanning');
                    scanBtnText.textContent = 'Retry Scan';
                    return;
                }

                if (result.skipped) {
                    setStatus('✓ Content unchanged — using cached result', 'done');
                } else {
                    setStatus('✓ Scan complete!', 'done');
                }

                showResult(result);
                scanBtn.disabled = false;
                scanBtn.classList.remove('scanning');
                scanBtnText.textContent = 'Re-scan';
            })
            .catch(function(err) {
                setStatus('✗ Network error', 'error');
                scanBtn.disabled = false;
                scanBtn.classList.remove('scanning');
                scanBtnText.textContent = 'Retry Scan';
            });
        });

        // On load, check if there's an existing scan result for this page.
        fetch(restUrl + '/scanner/results?' + new URLSearchParams({ page: 1, per_page: 1, object_type: objectType, object_id: objectId, lang: lang }), {
            headers: { 'X-WP-Nonce': nonce }
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            var result = data.results && data.results[0];
            if (result) {
                showResult(result);
                scanBtnText.textContent = 'Re-scan';
            }
        })
        .catch(function() {});
    })();
    </script>
    <?php
}, 100 );
