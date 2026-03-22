import { useState, useEffect, useCallback } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { CheckCircle, XCircle, Loader2, ScanSearch, Zap } from 'lucide-react';

// ─── Quick (code-based) checks ──────────────────────────────────────────────

function contains( text, keyphrase ) {
    if ( ! text || ! keyphrase ) return false;
    return text.toLowerCase().includes( keyphrase.toLowerCase() );
}

function QuickChecks( { keyphrase, seoTitle, metaDesc, lang, postId, permalink } ) {
    const [ renderData, setRenderData ] = useState( null );
    const [ loading, setLoading ] = useState( false );

    const fetchContent = useCallback( async () => {
        if ( ! postId || ! keyphrase ) return;
        setLoading( true );
        try {
            const res = await fetch( `${ window.snelSeoEditor.renderUrl }/${ postId }?lang=${ lang }`, {
                headers: { 'X-WP-Nonce': window.snelSeoEditor.nonce },
            } );
            setRenderData( await res.json() );
        } catch ( e ) { /* ignore */ }
        setLoading( false );
    }, [ postId, lang, keyphrase ] );

    useEffect( () => { fetchContent(); }, [ fetchContent ] );

    if ( loading ) {
        return (
            <div className="flex items-center gap-2 py-3 text-xs text-gray-400">
                <Loader2 size={ 12 } className="animate-spin" />
                { __( 'Loading content...', 'snel-seo' ) }
            </div>
        );
    }

    if ( ! keyphrase || ! renderData ) return null;

    const kw = keyphrase.toLowerCase();
    const escapedKw = kw.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
    const paragraphs = renderData.paragraphs || [];
    const headings = renderData.headings || [];
    const fullText = renderData.full_text || '';
    const firstParagraph = paragraphs[ 0 ] || '';
    const bodyCount = ( fullText.toLowerCase().match( new RegExp( escapedKw, 'g' ) ) || [] ).length;
    const slug = decodeURIComponent( permalink ).toLowerCase();

    const checks = [
        {
            id: 'title',
            pass: contains( seoTitle, keyphrase ),
            good: __( 'Keyphrase found in SEO title', 'snel-seo' ),
            bad: __( 'Keyphrase not found in SEO title', 'snel-seo' ),
        },
        {
            id: 'description',
            pass: contains( metaDesc, keyphrase ),
            good: __( 'Keyphrase found in meta description', 'snel-seo' ),
            bad: __( 'Keyphrase not found in meta description', 'snel-seo' ),
        },
        {
            id: 'headings',
            pass: headings.some( ( h ) => contains( h, keyphrase ) ),
            good: __( 'Keyphrase found in a heading', 'snel-seo' ),
            bad: __( 'Keyphrase not found in any heading', 'snel-seo' ),
        },
        {
            id: 'body',
            pass: bodyCount >= 2,
            good: `${ __( 'Keyphrase appears', 'snel-seo' ) } ${ bodyCount }x ${ __( 'in the content', 'snel-seo' ) }`,
            bad: bodyCount === 1
                ? __( 'Keyphrase appears only once in the content', 'snel-seo' )
                : __( 'Keyphrase not found in the content', 'snel-seo' ),
        },
        {
            id: 'slug',
            pass: contains( slug, keyphrase.replace( /\s+/g, '-' ) ),
            good: __( 'Keyphrase found in URL', 'snel-seo' ),
            bad: __( 'Keyphrase not found in URL', 'snel-seo' ),
        },
    ];

    const passCount = checks.filter( ( c ) => c.pass ).length;

    return (
        <>
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600">
                    { __( 'Quick Analysis', 'snel-seo' ) }
                </span>
                <span className={ `text-xs font-medium px-2 py-0.5 rounded-full ${
                    passCount === checks.length ? 'bg-emerald-100 text-emerald-700'
                        : passCount >= checks.length / 2 ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                }` }>
                    { passCount }/{ checks.length }
                </span>
            </div>
            <ul className="space-y-1.5">
                { checks.map( ( check ) => (
                    <li key={ check.id } className="flex items-start gap-2 text-xs text-gray-600">
                        { check.pass
                            ? <CheckCircle size={ 14 } className="text-emerald-500 mt-0.5 shrink-0" />
                            : <XCircle size={ 14 } className="text-red-400 mt-0.5 shrink-0" />
                        }
                        <span>{ check.pass ? check.good : check.bad }</span>
                    </li>
                ) ) }
            </ul>
        </>
    );
}

// ─── AI checks ──────────────────────────────────────────────────────────────

const AI_CHECKS = [
    { id: 'title', label: 'Keyphrase in SEO title' },
    { id: 'description', label: 'Keyphrase in meta description' },
    { id: 'opening', label: 'Keyphrase in opening content' },
    { id: 'body', label: 'Keyphrase usage in content' },
    { id: 'url', label: 'Keyphrase in URL' },
    { id: 'overall', label: 'Overall SEO assessment' },
];

function AiChecks( { keyphrase, seoTitle, metaDesc, lang, postId, permalink } ) {
    const [ results, setResults ] = useState( {} );
    const [ scanning, setScanning ] = useState( false );
    const [ activeCheck, setActiveCheck ] = useState( null );

    const handleScan = async () => {
        if ( ! postId || ! keyphrase || scanning ) return;
        setScanning( true );
        setResults( {} );

        let content = '';
        try {
            const renderRes = await fetch( `${ window.snelSeoEditor.renderUrl }/${ postId }?lang=${ lang }`, {
                headers: { 'X-WP-Nonce': window.snelSeoEditor.nonce },
            } );
            const renderData = await renderRes.json();
            content = renderData.full_text || '';
        } catch ( e ) {
            setScanning( false );
            return;
        }

        for ( const check of AI_CHECKS ) {
            setActiveCheck( check.id );

            try {
                const res = await fetch( `${ window.snelSeoEditor.analyzeUrl }/${ postId }`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.snelSeoEditor.nonce },
                    body: JSON.stringify( {
                        check: check.id,
                        keyphrase,
                        seo_title: seoTitle,
                        meta_desc: metaDesc,
                        content,
                        url: permalink,
                        lang,
                    } ),
                } );
                const data = await res.json();
                console.log( `[Snel SEO] Analyze "${ check.id }" input:`, { keyphrase, seo_title: seoTitle, meta_desc: metaDesc, url: permalink, content: content.substring( 0, 200 ) + '...' } );
                console.log( `[Snel SEO] Analyze "${ check.id }" result:`, data );
                setResults( ( prev ) => ( { ...prev, [ check.id ]: data } ) );
            } catch ( err ) {
                setResults( ( prev ) => ( {
                    ...prev,
                    [ check.id ]: { pass: false, message: 'Analysis failed', suggestion: '' },
                } ) );
            }

            await new Promise( ( r ) => setTimeout( r, 200 ) );
        }

        setActiveCheck( null );
        setScanning( false );
    };

    const completedChecks = Object.keys( results ).length;
    const passCount = Object.values( results ).filter( ( r ) => r.pass ).length;
    const hasResults = completedChecks > 0;

    return (
        <>
            <button
                type="button"
                onClick={ handleScan }
                disabled={ scanning }
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
                { scanning ? (
                    <>
                        <Loader2 size={ 12 } className="animate-spin" />
                        { __( 'Analyzing...', 'snel-seo' ) }
                    </>
                ) : (
                    <>
                        <ScanSearch size={ 12 } />
                        { hasResults ? __( 'Re-scan', 'snel-seo' ) : __( 'Scan SEO', 'snel-seo' ) }
                    </>
                ) }
            </button>

            { ( hasResults || scanning ) && (
                <>
                    { hasResults && ! scanning && (
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-600">
                                { __( 'AI Analysis', 'snel-seo' ) }
                                <span className="ml-1.5 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">beta</span>
                            </span>
                            <span className={ `text-xs font-medium px-2 py-0.5 rounded-full ${
                                passCount === AI_CHECKS.length ? 'bg-emerald-100 text-emerald-700'
                                    : passCount >= AI_CHECKS.length / 2 ? 'bg-amber-100 text-amber-700'
                                        : 'bg-red-100 text-red-700'
                            }` }>
                                { passCount }/{ AI_CHECKS.length }
                            </span>
                        </div>
                    ) }

                    <ul className="space-y-2.5">
                        { AI_CHECKS.map( ( check ) => {
                            const result = results[ check.id ];
                            const isActive = activeCheck === check.id;
                            const isPending = scanning && ! result && ! isActive;

                            return (
                                <li
                                    key={ check.id }
                                    className={ `transition-all duration-300 ${ result ? 'opacity-100 translate-y-0' : isActive ? 'opacity-100' : isPending ? 'opacity-30' : 'opacity-0 h-0 overflow-hidden' }` }
                                >
                                    <div className="flex items-start gap-2 text-xs">
                                        { isActive && <Loader2 size={ 14 } className="text-blue-500 mt-0.5 shrink-0 animate-spin" /> }
                                        { result && result.pass && <CheckCircle size={ 14 } className="text-emerald-500 mt-0.5 shrink-0" /> }
                                        { result && ! result.pass && <XCircle size={ 14 } className="text-red-400 mt-0.5 shrink-0" /> }
                                        { isPending && <div className="w-3.5 h-3.5 rounded-full bg-gray-200 mt-0.5 shrink-0" /> }
                                        <div className="flex-1 min-w-0">
                                            { isActive && (
                                                <span className="text-blue-600 font-medium">
                                                    { __( 'Checking', 'snel-seo' ) }: { check.label }...
                                                </span>
                                            ) }
                                            { result && (
                                                <>
                                                    <span className="font-medium text-gray-700">{ result.message }</span>
                                                    { result.suggestion && (
                                                        <p className="mt-1 text-gray-500 leading-relaxed">{ result.suggestion }</p>
                                                    ) }
                                                </>
                                            ) }
                                            { isPending && <span className="text-gray-400">{ check.label }</span> }
                                        </div>
                                    </div>
                                </li>
                            );
                        } ) }
                    </ul>
                </>
            ) }
        </>
    );
}

// ─── Main component with tabs ───────────────────────────────────────────────

export default function KeyphraseChecks( { keyphrase, seoTitle, metaDesc, lang } ) {
    const [ activeTab, setActiveTab ] = useState( 'quick' );

    const { postId, permalink } = useSelect( ( select ) => {
        const editor = select( 'core/editor' );
        return {
            postId: editor?.getCurrentPostId?.(),
            permalink: editor?.getPermalink?.() || '',
        };
    }, [] );

    if ( ! keyphrase ) return null;

    const tabs = [
        { id: 'quick', label: __( 'Quick', 'snel-seo' ), icon: Zap },
        { id: 'ai', label: __( 'AI', 'snel-seo' ), badge: 'beta' },
    ];

    return (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            {/* Tabs */}
            <div className="flex items-center gap-1 mb-3 border-b border-gray-200 pb-2">
                { tabs.map( ( tab ) => (
                    <button
                        key={ tab.id }
                        type="button"
                        onClick={ () => setActiveTab( tab.id ) }
                        className={ `inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                            activeTab === tab.id
                                ? 'bg-white text-gray-800 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }` }
                    >
                        { tab.icon && <tab.icon size={ 12 } /> }
                        { tab.label }
                        { tab.badge && (
                            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1 py-0.5 rounded leading-none">
                                { tab.badge }
                            </span>
                        ) }
                    </button>
                ) ) }
            </div>

            {/* Tab content */}
            { activeTab === 'quick' && (
                <QuickChecks
                    keyphrase={ keyphrase }
                    seoTitle={ seoTitle }
                    metaDesc={ metaDesc }
                    lang={ lang }
                    postId={ postId }
                    permalink={ permalink }
                />
            ) }
            { activeTab === 'ai' && (
                <AiChecks
                    keyphrase={ keyphrase }
                    seoTitle={ seoTitle }
                    metaDesc={ metaDesc }
                    lang={ lang }
                    postId={ postId }
                    permalink={ permalink }
                />
            ) }
        </div>
    );
}
