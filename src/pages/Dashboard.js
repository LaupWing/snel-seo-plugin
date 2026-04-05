import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Search, Settings, ArrowRight, Shield, Globe, Play, Loader2, CheckCircle, AlertTriangle, XCircle, ChevronDown } from 'lucide-react';
import Select from '../components/Select';

function api( path, opts = {} ) {
    return fetch( `${ window.snelSeo.restUrl }${ path }`, {
        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.snelSeo.nonce },
        ...opts,
    } ).then( ( r ) => r.json() );
}

const STATUS_ICON = {
    ok: ( <CheckCircle size={ 14 } className="text-emerald-500" /> ),
    warning: ( <AlertTriangle size={ 14 } className="text-amber-500" /> ),
    error: ( <XCircle size={ 14 } className="text-red-500" /> ),
};

const CHECK_LABELS = {
    title: 'Title',
    meta_desc: 'Meta Description',
    h1: 'H1',
    content_lang: 'Content Language',
    desc_relevance: 'Description Relevance',
};

function ScoreCircle( { score } ) {
    const color = score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-500';
    const bg = score >= 80 ? 'bg-emerald-50' : score >= 50 ? 'bg-amber-50' : 'bg-red-50';
    return (
        <div className={ `w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${ color } ${ bg }` }>
            { score }
        </div>
    );
}

function ScanResult( { result } ) {
    const [ open, setOpen ] = useState( false );
    const checks = result.checks || {};

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
                type="button"
                onClick={ () => setOpen( ! open ) }
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
                <ScoreCircle score={ result.score } />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{ result.post_title || result.url }</p>
                    <p className="text-xs text-gray-400 truncate">{ result.url } · { result.lang?.toUpperCase() }</p>
                </div>
                <p className="text-xs text-gray-500 hidden md:block max-w-xs truncate">{ result.ai_summary }</p>
                <ChevronDown size={ 16 } className={ `shrink-0 text-gray-400 transition-transform ${ open ? 'rotate-180' : '' }` } />
            </button>
            { open && (
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 space-y-2">
                    { Object.entries( checks ).map( ( [ key, check ] ) => (
                        <div key={ key } className="flex items-start gap-2 text-sm">
                            { STATUS_ICON[ check.status ] || STATUS_ICON.warning }
                            <span className="font-medium text-gray-700 w-40 shrink-0">{ CHECK_LABELS[ key ] || key }</span>
                            <span className="text-gray-500">{ check.message }</span>
                        </div>
                    ) ) }
                    { result.ai_summary && (
                        <p className="text-xs text-gray-400 italic pt-2 border-t border-gray-200 mt-2">{ result.ai_summary }</p>
                    ) }
                </div>
            ) }
        </div>
    );
}

function ScannerCard() {
    const [ scanning, setScanning ] = useState( false );
    const [ progress, setProgress ] = useState( { done: 0, total: 0 } );
    const [ statusText, setStatusText ] = useState( '' );
    const [ statusAnim, setStatusAnim ] = useState( {} );
    const [ recentScans, setRecentScans ] = useState( [] );
    const [ summary, setSummary ] = useState( null );
    const [ results, setResults ] = useState( [] );
    const [ filterLang, setFilterLang ] = useState( '' );
    const [ filterStatus, setFilterStatus ] = useState( '' );
    const [ page, setPage ] = useState( 1 );
    const [ totalPages, setTotalPages ] = useState( 1 );
    const [ loadingResults, setLoadingResults ] = useState( false );
    const [ scanLang, setScanLang ] = useState( '' ); // '' = all languages
    const [ availableLangs, setAvailableLangs ] = useState( [] );

    const animateStatus = ( text ) => {
        return new Promise( ( resolve ) => {
            setStatusAnim( { transform: 'translateY(-100%)', opacity: 0, transition: 'all 0.15s ease-in' } );
            setTimeout( () => {
                setStatusText( text );
                setStatusAnim( { transform: 'translateY(100%)', opacity: 0, transition: 'none' } );
                requestAnimationFrame( () => {
                    requestAnimationFrame( () => {
                        setStatusAnim( { transform: 'translateY(0)', opacity: 1, transition: 'all 0.2s ease-out' } );
                        setTimeout( resolve, 200 );
                    } );
                } );
            }, 150 );
        } );
    };

    const loadSummary = useCallback( async () => {
        const data = await api( '/scanner/summary' );
        if ( data.total > 0 ) setSummary( data );
    }, [] );

    // Load available languages on mount.
    useEffect( () => {
        api( '/scanner/queue' ).then( ( data ) => {
            setAvailableLangs( data.languages || [] );
        } );
    }, [] );

    const loadResults = useCallback( async () => {
        setLoadingResults( true );
        const params = new URLSearchParams( { page, per_page: 20 } );
        if ( filterLang ) params.set( 'lang', filterLang );
        if ( filterStatus ) params.set( 'status', filterStatus );
        const data = await api( `/scanner/results?${ params }` );
        setResults( data.results || [] );
        setTotalPages( data.pages || 1 );
        setLoadingResults( false );
    }, [ page, filterLang, filterStatus ] );

    useEffect( () => { loadSummary(); }, [ loadSummary ] );
    useEffect( () => { if ( summary ) loadResults(); }, [ summary, loadResults ] );

    const startScan = async () => {
        setScanning( true );
        setProgress( { done: 0, total: 0 } );
        setRecentScans( [] );

        const queue = await api( '/scanner/queue' );
        const postIds = queue.post_ids || [];
        const allLangs = queue.languages || [ 'nl' ];
        const languages = scanLang ? [ scanLang ] : allLangs;
        const total = postIds.length * languages.length;
        setProgress( { done: 0, total } );

        await animateStatus( '✦ Loading scan queue...' );

        let done = 0;
        for ( const postId of postIds ) {
            for ( const lang of languages ) {
                const postTitle = `Post #${ postId }`;
                await animateStatus( `⟳ Fetching ${ lang.toUpperCase() } page...` );

                const data = await api( '/scanner/batch', {
                    method: 'POST',
                    body: JSON.stringify( { post_ids: [ postId ], languages: [ lang ] } ),
                } );

                const result = data.results?.[ 0 ];
                done++;
                setProgress( { done, total } );

                if ( result?.skipped ) {
                    await animateStatus( `↳ ${ lang.toUpperCase() } unchanged — skipped ✓` );
                } else if ( result?.error ) {
                    await animateStatus( `✗ ${ lang.toUpperCase() } — ${ result.error }` );
                } else if ( result ) {
                    await animateStatus( `✓ ${ lang.toUpperCase() } — Score: ${ result.score }` );
                    setRecentScans( ( prev ) => [ { ...result, post_title: postTitle }, ...prev ].slice( 0, 5 ) );
                }
            }
        }

        await animateStatus( '✓ Scan complete!' );
        setScanning( false );
        await loadSummary();
        await loadResults();
    };

    const pct = progress.total > 0 ? Math.round( ( progress.done / progress.total ) * 100 ) : 0;

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                        <Shield size={ 16 } className="text-purple-600" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">
                            { __( 'SEO Scanner', 'snel-seo' ) }
                        </h2>
                        { summary && (
                            <p className="text-xs text-gray-400">
                                { __( 'Last scan:', 'snel-seo' ) } { summary.last_scan ? new Date( summary.last_scan ).toLocaleDateString() : '—' }
                            </p>
                        ) }
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Select
                        value={ scanLang }
                        onChange={ setScanLang }
                        disabled={ scanning }
                        options={ [
                            { value: '', label: __( 'All languages', 'snel-seo' ) },
                            ...availableLangs.map( ( l ) => ( { value: l, label: `${ l.toUpperCase() } ${ __( 'only', 'snel-seo' ) }` } ) ),
                        ] }
                    />
                    <button
                        type="button"
                        onClick={ startScan }
                        disabled={ scanning }
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        { scanning ? ( <><Loader2 size={ 14 } className="animate-spin" /> { __( 'Scanning...', 'snel-seo' ) }</> )
                            : ( <><Play size={ 14 } /> { scanLang ? `Scan ${ scanLang.toUpperCase() }` : __( 'Scan All Pages', 'snel-seo' ) }</> ) }
                    </button>
                </div>
            </div>

            {/* Progress bar + live status */ }
            { scanning && (
                <div className="mb-4">
                    {/* Animated status text */ }
                    <div className="h-6 overflow-hidden mb-2">
                        <p className={ `text-xs font-medium ${ statusText.includes( '✗' ) ? 'text-red-500' : statusText.includes( '✓' ) ? 'text-emerald-600' : 'text-purple-600' }` } style={ statusAnim }>
                            { statusText }
                        </p>
                    </div>

                    {/* Progress bar */ }
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>{ progress.done } / { progress.total } { __( 'pages', 'snel-seo' ) }</span>
                        <span>{ pct }%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full transition-all duration-500 ease-out" style={ { width: `${ pct }%` } } />
                    </div>

                    {/* Recent scans feed */ }
                    { recentScans.length > 0 && (
                        <div className="mt-3 space-y-1">
                            { recentScans.map( ( r, i ) => (
                                <div key={ `${ r.post_id }-${ r.lang }-${ i }` }
                                     className="flex items-center gap-2 text-xs text-gray-500 animate-fadeIn"
                                     style={ { opacity: 1 - ( i * 0.15 ) } }>
                                    <ScoreCircle score={ r.score } />
                                    <span className="truncate flex-1">{ r.url }</span>
                                    <span className="text-gray-400">{ r.lang?.toUpperCase() }</span>
                                    <span className="text-gray-400 truncate max-w-[200px]">{ r.summary }</span>
                                </div>
                            ) ) }
                        </div>
                    ) }
                </div>
            ) }

            {/* Summary stats */ }
            { summary && ! scanning && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-gray-900">{ summary.total }</p>
                        <p className="text-xs text-gray-500">{ __( 'Total Scans', 'snel-seo' ) }</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-emerald-600">{ summary.good }</p>
                        <p className="text-xs text-gray-500">{ __( 'Good', 'snel-seo' ) }</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-amber-600">{ summary.warnings }</p>
                        <p className="text-xs text-gray-500">{ __( 'Warnings', 'snel-seo' ) }</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-red-600">{ summary.errors }</p>
                        <p className="text-xs text-gray-500">{ __( 'Errors', 'snel-seo' ) }</p>
                    </div>
                </div>
            ) }

            {/* Per-language breakdown */ }
            { summary?.per_lang?.length > 0 && ! scanning && (
                <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">{ __( 'Per Language', 'snel-seo' ) }</p>
                    <div className="flex flex-wrap gap-2">
                        { summary.per_lang.map( ( l ) => (
                            <div key={ l.lang } className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-xs">
                                <span className="font-medium text-gray-700">{ l.lang.toUpperCase() }</span>
                                <span className="text-emerald-600">{ l.good } ✓</span>
                                <span className="text-amber-600">{ l.issues } !</span>
                                <span className="text-gray-400">avg { Math.round( l.avg_score ) }</span>
                            </div>
                        ) ) }
                    </div>
                </div>
            ) }

            {/* Scan History + Results */ }
            { summary && ! scanning && (
                <>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Search size={ 14 } className="text-gray-400" />
                            <h3 className="text-sm font-semibold text-gray-700">{ __( 'Scan Results', 'snel-seo' ) }</h3>
                            <span className="text-xs text-gray-400">
                                { summary.last_scan && `${ __( 'Last scan:', 'snel-seo' ) } ${ new Date( summary.last_scan ).toLocaleString() }` }
                            </span>
                        </div>
                        <span className="text-xs text-gray-400">
                            { __( 'Avg score:', 'snel-seo' ) } <strong className={ summary.avg_score >= 80 ? 'text-emerald-600' : summary.avg_score >= 50 ? 'text-amber-600' : 'text-red-600' }>{ summary.avg_score }</strong>
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <Select
                            value={ filterLang }
                            onChange={ ( v ) => { setFilterLang( v ); setPage( 1 ); } }
                            options={ [
                                { value: '', label: __( 'All languages', 'snel-seo' ) },
                                ...( summary.per_lang || [] ).map( ( l ) => ( { value: l.lang, label: l.lang.toUpperCase() } ) ),
                            ] }
                        />
                        <Select
                            value={ filterStatus }
                            onChange={ ( v ) => { setFilterStatus( v ); setPage( 1 ); } }
                            options={ [
                                { value: '', label: __( 'All statuses', 'snel-seo' ) },
                                { value: 'good', label: __( 'Good (80+)', 'snel-seo' ) },
                                { value: 'issues', label: __( 'Issues (<80)', 'snel-seo' ) },
                            ] }
                        />
                    </div>

                    { loadingResults ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 size={ 20 } className="animate-spin text-gray-400" />
                        </div>
                    ) : results.length > 0 ? (
                        <div className="space-y-2">
                            { results.map( ( r ) => <ScanResult key={ `${ r.post_id }-${ r.lang }` } result={ r } /> ) }
                        </div>
                    ) : (
                        <p className="text-center text-sm text-gray-400 py-6">{ __( 'No results found.', 'snel-seo' ) }</p>
                    ) }

                    {/* Pagination */ }
                    { totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                            <button
                                type="button"
                                onClick={ () => setPage( ( p ) => Math.max( 1, p - 1 ) ) }
                                disabled={ page <= 1 }
                                className="px-3 py-1 text-xs text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-30 transition-colors"
                            >←</button>
                            <span className="text-xs text-gray-500">{ page } / { totalPages }</span>
                            <button
                                type="button"
                                onClick={ () => setPage( ( p ) => Math.min( totalPages, p + 1 ) ) }
                                disabled={ page >= totalPages }
                                className="px-3 py-1 text-xs text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-30 transition-colors"
                            >→</button>
                        </div>
                    ) }
                </>
            ) }

            {/* Empty state */ }
            { ! summary && ! scanning && (
                <p className="text-sm text-gray-400 italic">
                    { __( 'No scans yet. Click "Scan All Pages" to analyze your site\'s SEO across all languages.', 'snel-seo' ) }
                </p>
            ) }
        </div>
    );
}

export default function Dashboard() {
    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-xl font-bold text-gray-900">
                    Snel <em className="font-serif font-normal italic">SEO</em>
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    { __( 'Lightweight SEO toolkit by Snelstack', 'snel-seo' ) } — v{ window.snelSeo?.version }
                </p>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {/* Site overview */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <Globe size={ 16 } className="text-blue-600" />
                        </div>
                        <h2 className="text-sm font-semibold text-gray-900">
                            { __( 'Site Overview', 'snel-seo' ) }
                        </h2>
                    </div>
                    <div className="space-y-2 text-sm">
                        <p className="text-gray-600">
                            <span className="text-gray-400">{ __( 'Site:', 'snel-seo' ) }</span>{ ' ' }
                            { window.snelSeo?.siteName }
                        </p>
                        <p className="text-gray-600">
                            <span className="text-gray-400">{ __( 'URL:', 'snel-seo' ) }</span>{ ' ' }
                            { window.snelSeo?.siteUrl }
                        </p>
                        <p className="text-gray-600">
                            <span className="text-gray-400">{ __( 'Tagline:', 'snel-seo' ) }</span>{ ' ' }
                            { window.snelSeo?.siteDesc || '—' }
                        </p>
                    </div>
                </div>

                {/* Quick actions */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                            <Settings size={ 16 } className="text-emerald-600" />
                        </div>
                        <h2 className="text-sm font-semibold text-gray-900">
                            { __( 'Quick Actions', 'snel-seo' ) }
                        </h2>
                    </div>
                    <div className="space-y-2">
                        <a href="?page=snel-seo-settings" className="flex items-center justify-between text-sm text-gray-600 hover:text-blue-600 transition-colors">
                            { __( 'Configure SEO settings', 'snel-seo' ) }
                            <ArrowRight size={ 14 } />
                        </a>
                        <a href="?page=snel-seo-redirects" className="flex items-center justify-between text-sm text-gray-600 hover:text-blue-600 transition-colors">
                            { __( 'Manage redirects', 'snel-seo' ) }
                            <ArrowRight size={ 14 } />
                        </a>
                        <a href="?page=snel-seo-tools" className="flex items-center justify-between text-sm text-gray-600 hover:text-blue-600 transition-colors">
                            { __( 'Import / Export', 'snel-seo' ) }
                            <ArrowRight size={ 14 } />
                        </a>
                    </div>
                </div>

                {/* Scan info */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                            <Search size={ 16 } className="text-purple-600" />
                        </div>
                        <h2 className="text-sm font-semibold text-gray-900">
                            { __( 'How It Works', 'snel-seo' ) }
                        </h2>
                    </div>
                    <div className="space-y-1.5 text-xs text-gray-500">
                        <p>1. { __( 'Renders every page across all languages', 'snel-seo' ) }</p>
                        <p>2. { __( 'Extracts title, description, headings, content', 'snel-seo' ) }</p>
                        <p>3. { __( 'AI analyzes language accuracy and SEO quality', 'snel-seo' ) }</p>
                        <p>4. { __( 'Results scored and stored for review', 'snel-seo' ) }</p>
                    </div>
                </div>
            </div>

            {/* Scanner — full width */}
            <ScannerCard />
        </div>
    );
}
