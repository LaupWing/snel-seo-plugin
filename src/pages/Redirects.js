import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Modal, SelectControl } from '@wordpress/components';
import { ArrowRightLeft, Plus, Trash2, ArrowRight, Loader2, Upload, Trash, Search, ChevronLeft, ChevronRight, Pencil, AlertTriangle, ExternalLink, Asterisk, FlaskConical, CheckCircle2, XCircle, Filter } from 'lucide-react';
import Tabs from '../components/Tabs';

const TABS = [
    { id: 'redirects', label: 'Redirects', icon: ArrowRightLeft },
    { id: '404-log', label: '404 Log', icon: AlertTriangle },
];

function FourOhFourLog( { onAddRedirect } ) {
    const [ entries, setEntries ] = useState( [] );
    const [ loading, setLoading ] = useState( true );
    const [ searchQuery, setSearchQuery ] = useState( '' );
    const [ currentPage, setCurrentPage ] = useState( 1 );
    const perPage = 20;

    const fetchEntries = async () => {
        try {
            const res = await fetch( `${ window.snelSeo.restUrl }/404-log`, {
                headers: { 'X-WP-Nonce': window.snelSeo.nonce },
            } );
            const data = await res.json();
            setEntries( Array.isArray( data ) ? data : [] );
        } catch { /* ignore */ }
        setLoading( false );
    };

    useEffect( () => { fetchEntries(); }, [] );

    const handleDelete = async ( id ) => {
        try {
            await fetch( `${ window.snelSeo.restUrl }/404-log/${ id }`, {
                method: 'DELETE',
                headers: { 'X-WP-Nonce': window.snelSeo.nonce },
            } );
            setEntries( ( prev ) => prev.filter( ( e ) => e.id !== id ) );
        } catch { /* ignore */ }
    };

    const handleClearAll = async () => {
        if ( ! confirm( __( 'Clear all 404 log entries? This cannot be undone.', 'snel-seo' ) ) ) return;
        try {
            await fetch( `${ window.snelSeo.restUrl }/404-log/all`, {
                method: 'DELETE',
                headers: { 'X-WP-Nonce': window.snelSeo.nonce },
            } );
            setEntries( [] );
        } catch { /* ignore */ }
    };

    const filtered = entries.filter( ( e ) =>
        ! searchQuery || e.url.toLowerCase().includes( searchQuery.toLowerCase() )
    );
    const totalPages = Math.ceil( filtered.length / perPage );
    const paginated = filtered.slice( ( currentPage - 1 ) * perPage, currentPage * perPage );

    const formatDate = ( dateStr ) => {
        if ( ! dateStr ) return '—';
        const d = new Date( dateStr );
        return d.toLocaleDateString( 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' } )
            + ' ' + d.toLocaleTimeString( 'en-GB', { hour: '2-digit', minute: '2-digit' } );
    };

    return (
        <>
            {/* Header actions */ }
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">
                    { entries.length > 0
                        ? `${ entries.length } ${ __( 'URLs returning 404', 'snel-seo' ) }`
                        : __( 'No 404 errors logged yet.', 'snel-seo' )
                    }
                </p>
                { entries.length > 0 && (
                    <button
                        onClick={ handleClearAll }
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                        <Trash size={ 14 } />
                        { __( 'Clear Log', 'snel-seo' ) }
                    </button>
                ) }
            </div>

            {/* Search */ }
            { ! loading && entries.length > 0 && (
                <div className="mb-4 relative">
                    <Search size={ 14 } className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={ searchQuery }
                        onChange={ ( e ) => { setSearchQuery( e.target.value ); setCurrentPage( 1 ); } }
                        placeholder={ __( 'Search 404 URLs...', 'snel-seo' ) }
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_1px_#3b82f6]"
                    />
                    { searchQuery && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                            { filtered.length } { __( 'results', 'snel-seo' ) }
                        </span>
                    ) }
                </div>
            ) }

            {/* Loading */ }
            { loading && (
                <div className="flex items-center gap-2 py-8 justify-center text-sm text-gray-400">
                    <Loader2 size={ 14 } className="animate-spin" />
                    { __( 'Loading...', 'snel-seo' ) }
                </div>
            ) }

            {/* Empty state */ }
            { ! loading && entries.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={ 20 } className="text-emerald-400" />
                    </div>
                    <h2 className="text-sm font-semibold text-gray-900 mb-1">
                        { __( 'No 404 errors logged', 'snel-seo' ) }
                    </h2>
                    <p className="text-sm text-gray-500">
                        { __( '404 errors will appear here as visitors hit missing pages.', 'snel-seo' ) }
                    </p>
                </div>
            ) }

            {/* Table */ }
            { ! loading && filtered.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="text-left px-4 py-3 font-medium text-gray-600">
                                    { __( 'URL', 'snel-seo' ) }
                                </th>
                                <th className="text-center px-4 py-3 font-medium text-gray-600 w-16">
                                    { __( 'Hits', 'snel-seo' ) }
                                </th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600 w-44">
                                    { __( 'Last Seen', 'snel-seo' ) }
                                </th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600 w-48">
                                    { __( 'Referrer', 'snel-seo' ) }
                                </th>
                                <th className="w-24" />
                            </tr>
                        </thead>
                        <tbody>
                            { paginated.map( ( e ) => (
                                <tr key={ e.id } className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono text-xs text-gray-700 break-all">
                                        { e.url }
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={ `text-xs font-semibold px-2 py-0.5 rounded ${ parseInt( e.hits ) >= 10 ? 'bg-red-100 text-red-700' : parseInt( e.hits ) >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600' }` }>
                                            { e.hits }
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        { formatDate( e.last_seen ) }
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-[200px]" title={ e.referrer }>
                                        { e.referrer ? e.referrer.replace( /^https?:\/\//, '' ).split( '/' )[ 0 ] : '—' }
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center gap-1 justify-center">
                                            <button
                                                onClick={ () => onAddRedirect( e.url ) }
                                                className="p-1 text-gray-400 hover:text-blue-500 transition-colors rounded hover:bg-blue-50"
                                                title={ __( 'Create redirect for this URL', 'snel-seo' ) }
                                            >
                                                <ExternalLink size={ 14 } />
                                            </button>
                                            <button
                                                onClick={ () => handleDelete( e.id ) }
                                                className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-red-50"
                                                title={ __( 'Dismiss', 'snel-seo' ) }
                                            >
                                                <Trash2 size={ 14 } />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) ) }
                        </tbody>
                    </table>

                    {/* Pagination */ }
                    { totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <span className="text-xs text-gray-500">
                                { __( 'Showing', 'snel-seo' ) } { ( currentPage - 1 ) * perPage + 1 }–{ Math.min( currentPage * perPage, filtered.length ) } { __( 'of', 'snel-seo' ) } { filtered.length }
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={ () => setCurrentPage( ( p ) => Math.max( 1, p - 1 ) ) }
                                    disabled={ currentPage === 1 }
                                    className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={ 14 } />
                                </button>
                                <span className="text-xs text-gray-600 px-2">
                                    { currentPage } / { totalPages }
                                </span>
                                <button
                                    onClick={ () => setCurrentPage( ( p ) => Math.min( totalPages, p + 1 ) ) }
                                    disabled={ currentPage === totalPages }
                                    className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={ 14 } />
                                </button>
                            </div>
                        </div>
                    ) }
                </div>
            ) }
        </>
    );
}

export default function Redirects() {
    const [ activeTab, setActiveTab ] = useState( 'redirects' );
    const [ redirects, setRedirects ] = useState( [] );
    const [ loading, setLoading ] = useState( true );
    const [ showModal, setShowModal ] = useState( false );
    const [ sourceUrl, setSourceUrl ] = useState( '' );
    const [ targetUrl, setTargetUrl ] = useState( '' );
    const [ redirectType, setRedirectType ] = useState( '301' );
    const [ saving, setSaving ] = useState( false );
    const [ editingId, setEditingId ] = useState( null );
    const [ isPattern, setIsPattern ] = useState( false );

    const fetchRedirects = async () => {
        try {
            const res = await fetch( `${ window.snelSeo.restUrl }/redirects`, {
                headers: { 'X-WP-Nonce': window.snelSeo.nonce },
            } );
            const data = await res.json();
            setRedirects( Array.isArray( data ) ? data : [] );
        } catch ( e ) { /* ignore */ }
        setLoading( false );
    };

    useEffect( () => { fetchRedirects(); }, [] );

    const handleSave = async () => {
        if ( ! sourceUrl || ! targetUrl ) return;
        setSaving( true );
        try {
            const payload = { source_url: sourceUrl, target_url: targetUrl, type: parseInt( redirectType ), is_pattern: isPattern };
            if ( editingId ) {
                await fetch( `${ window.snelSeo.restUrl }/redirects/${ editingId }`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.snelSeo.nonce },
                    body: JSON.stringify( payload ),
                } );
            } else {
                await fetch( `${ window.snelSeo.restUrl }/redirects`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.snelSeo.nonce },
                    body: JSON.stringify( payload ),
                } );
            }
            setShowModal( false );
            setEditingId( null );
            setSourceUrl( '' );
            setTargetUrl( '' );
            setRedirectType( '301' );
            setIsPattern( false );
            await fetchRedirects();
        } catch ( e ) { /* ignore */ }
        setSaving( false );
    };

    const openEdit = ( r ) => {
        setEditingId( r.id );
        setSourceUrl( r.source_url );
        setTargetUrl( r.target_url );
        setRedirectType( String( r.type ) );
        setIsPattern( !! parseInt( r.is_pattern ) );
        setShowModal( true );
    };

    const openAdd = ( prefillSource ) => {
        setEditingId( null );
        setSourceUrl( prefillSource || '' );
        setTargetUrl( '' );
        setRedirectType( '301' );
        setIsPattern( false );
        setShowModal( true );
        setActiveTab( 'redirects' );
    };

    const handleDelete = async ( id ) => {
        try {
            await fetch( `${ window.snelSeo.restUrl }/redirects/${ id }`, {
                method: 'DELETE',
                headers: { 'X-WP-Nonce': window.snelSeo.nonce },
            } );
            setRedirects( ( prev ) => prev.filter( ( r ) => r.id !== id ) );
        } catch ( e ) { /* ignore */ }
    };

    const [ importing, setImporting ] = useState( false );
    const [ importResult, setImportResult ] = useState( null );
    const [ searchQuery, setSearchQuery ] = useState( '' );
    const [ currentPage, setCurrentPage ] = useState( 1 );
    const perPage = 20;

    // Test redirects state.
    const [ showTestModal, setShowTestModal ] = useState( false );
    const [ testInput, setTestInput ] = useState( '' );
    const [ testResults, setTestResults ] = useState( [] );
    const [ testRunning, setTestRunning ] = useState( false );
    const [ testProgress, setTestProgress ] = useState( { done: 0, total: 0 } );
    const [ testFilter, setTestFilter ] = useState( 'all' );
    const [ testSearchQuery, setTestSearchQuery ] = useState( '' );
    const [ testPage, setTestPage ] = useState( 1 );
    const testPerPage = 20;

    // Filter and paginate
    const filtered = redirects.filter( ( r ) =>
        ! searchQuery || r.source_url.toLowerCase().includes( searchQuery.toLowerCase() ) || r.target_url.toLowerCase().includes( searchQuery.toLowerCase() )
    );
    const totalPages = Math.ceil( filtered.length / perPage );
    const paginated = filtered.slice( ( currentPage - 1 ) * perPage, currentPage * perPage );

    const handleImport = async ( e ) => {
        const file = e.target.files?.[ 0 ];
        if ( ! file ) return;
        setImporting( true );
        setImportResult( null );
        try {
            const text = await file.text();
            const data = JSON.parse( text );
            const res = await fetch( `${ window.snelSeo.restUrl }/redirects/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.snelSeo.nonce },
                body: JSON.stringify( data ),
            } );
            const result = await res.json();
            setImportResult( result );
            await fetchRedirects();
        } catch ( err ) {
            setImportResult( { error: err.message } );
        }
        setImporting( false );
        e.target.value = '';
    };

    const handleClearAll = async () => {
        if ( ! confirm( __( 'Delete ALL redirects? This cannot be undone.', 'snel-seo' ) ) ) return;
        try {
            await fetch( `${ window.snelSeo.restUrl }/redirects/all`, {
                method: 'DELETE',
                headers: { 'X-WP-Nonce': window.snelSeo.nonce },
            } );
            setRedirects( [] );
        } catch ( e ) { /* ignore */ }
    };

    const handleTestRedirects = async ( urls ) => {
        if ( ! urls.length ) return;
        setTestRunning( true );
        setTestResults( [] );
        setTestFilter( 'all' );
        setTestSearchQuery( '' );
        setTestPage( 1 );

        const batchSize = 100;
        const total = urls.length;
        setTestProgress( { done: 0, total } );
        const allResults = [];

        for ( let i = 0; i < total; i += batchSize ) {
            const batch = urls.slice( i, i + batchSize );
            try {
                const res = await fetch( `${ window.snelSeo.restUrl }/redirects/test`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.snelSeo.nonce },
                    body: JSON.stringify( batch ),
                } );
                const data = await res.json();
                allResults.push( ...data );
                setTestResults( [ ...allResults ] );
                setTestProgress( { done: Math.min( i + batchSize, total ), total } );
            } catch { /* ignore */ }
        }

        setTestRunning( false );
        setTestProgress( { done: total, total } );
    };

    const [ dragOver, setDragOver ] = useState( false );

    const parseTestFile = async ( file ) => {
        const text = await file.text();
        try {
            const data = JSON.parse( text );
            // Support different JSON formats: array of strings, array of objects with url/old_url/source_url
            let urls = [];
            if ( Array.isArray( data ) ) {
                urls = data.map( ( item ) => {
                    if ( typeof item === 'string' ) return item;
                    return item.url || item.old_url || item.source_url || item.Top_pages || item.Page || '';
                } ).filter( Boolean );
            }
            return urls;
        } catch {
            // Not JSON — treat as plain text, one URL per line
            return text.trim().split( '\n' ).map( ( u ) => u.trim() ).filter( Boolean );
        }
    };

    const handleTestFileDrop = async ( e ) => {
        e.preventDefault();
        setDragOver( false );
        const file = e.dataTransfer?.files?.[ 0 ];
        if ( ! file ) return;
        const urls = await parseTestFile( file );
        if ( urls.length ) {
            setTestInput( urls.join( '\n' ) );
        }
    };

    const handleTestFileInput = async ( e ) => {
        const file = e.target.files?.[ 0 ];
        if ( ! file ) return;
        const urls = await parseTestFile( file );
        if ( urls.length ) {
            setTestInput( urls.join( '\n' ) );
        }
        e.target.value = '';
    };

    const openTestModal = () => {
        setShowTestModal( true );
        setTestInput( '' );
        setTestResults( [] );
        setTestRunning( false );
        setTestProgress( { done: 0, total: 0 } );
        setTestFilter( 'all' );
        setTestSearchQuery( '' );
        setTestPage( 1 );
    };

    const testOkCount = testResults.filter( ( r ) => r.status === 'ok' ).length;
    const testFailCount = testResults.filter( ( r ) => r.status === 'missing' ).length;

    const testFiltered = testResults
        .filter( ( r ) => testFilter === 'all' || ( testFilter === 'ok' && r.status === 'ok' ) || ( testFilter === 'missing' && r.status === 'missing' ) )
        .filter( ( r ) => ! testSearchQuery || r.url.toLowerCase().includes( testSearchQuery.toLowerCase() ) || ( r.target && r.target.toLowerCase().includes( testSearchQuery.toLowerCase() ) ) );
    const testTotalPages = Math.ceil( testFiltered.length / testPerPage );
    const testPaginated = testFiltered.slice( ( testPage - 1 ) * testPerPage, testPage * testPerPage );

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">
                        { __( 'Redirects', 'snel-seo' ) }
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        { __( 'Manage 301 redirects and monitor 404 errors.', 'snel-seo' ) }
                    </p>
                </div>
                { activeTab === 'redirects' && (
                    <div className="flex items-center gap-2">
                        { redirects.length > 0 && (
                            <button
                                onClick={ handleClearAll }
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                            >
                                <Trash size={ 14 } />
                                { __( 'Clear All', 'snel-seo' ) }
                            </button>
                        ) }
                        <button
                            onClick={ openTestModal }
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                        >
                            <FlaskConical size={ 14 } />
                            { __( 'Test Redirects', 'snel-seo' ) }
                        </button>
                        <label className={ `flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${ importing ? 'opacity-50 pointer-events-none' : '' }` }>
                            { importing ? <Loader2 size={ 14 } className="animate-spin" /> : <Upload size={ 14 } /> }
                            { importing ? __( 'Importing...', 'snel-seo' ) : __( 'Import JSON', 'snel-seo' ) }
                            <input type="file" accept=".json" onChange={ handleImport } className="hidden" />
                        </label>
                        <button
                            onClick={ () => openAdd() }
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus size={ 16 } />
                            { __( 'Add Redirect', 'snel-seo' ) }
                        </button>
                    </div>
                ) }
            </div>

            <Tabs tabs={ TABS } active={ activeTab } onChange={ setActiveTab } />

            { activeTab === 'redirects' && (
                <>
                    {/* Import result */}
                    { importResult && (
                        <div className={ `mb-4 px-4 py-3 rounded-lg text-sm ${ importResult.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700' }` }>
                            { importResult.error
                                ? `Import failed: ${ importResult.error }`
                                : `Imported ${ importResult.imported } redirects (${ importResult.skipped } skipped, ${ importResult.total } total in file)`
                            }
                            <button onClick={ () => setImportResult( null ) } className="ml-2 underline">dismiss</button>
                        </div>
                    ) }

                    {/* Search bar */}
                    { ! loading && redirects.length > 0 && (
                        <div className="mb-4 relative">
                            <Search size={ 14 } className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={ searchQuery }
                                onChange={ ( e ) => { setSearchQuery( e.target.value ); setCurrentPage( 1 ); } }
                                placeholder={ __( 'Search redirects...', 'snel-seo' ) }
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_1px_#3b82f6]"
                            />
                            { searchQuery && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                    { filtered.length } { __( 'results', 'snel-seo' ) }
                                </span>
                            ) }
                        </div>
                    ) }

                    {/* Loading */}
                    { loading && (
                        <div className="flex items-center gap-2 py-8 justify-center text-sm text-gray-400">
                            <Loader2 size={ 14 } className="animate-spin" />
                            { __( 'Loading...', 'snel-seo' ) }
                        </div>
                    ) }

                    {/* Empty state */}
                    { ! loading && redirects.length === 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ArrowRightLeft size={ 20 } className="text-gray-400" />
                            </div>
                            <h2 className="text-sm font-semibold text-gray-900 mb-1">
                                { __( 'No redirects yet', 'snel-seo' ) }
                            </h2>
                            <p className="text-sm text-gray-500">
                                { __( 'Click "Add Redirect" to create your first redirect.', 'snel-seo' ) }
                            </p>
                        </div>
                    ) }

                    {/* Table */}
                    { ! loading && filtered.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50">
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">
                                            { __( 'Source', 'snel-seo' ) }
                                        </th>
                                        <th className="w-8" />
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">
                                            { __( 'Target', 'snel-seo' ) }
                                        </th>
                                        <th className="text-center px-4 py-3 font-medium text-gray-600 w-16">
                                            { __( 'Type', 'snel-seo' ) }
                                        </th>
                                        <th className="text-center px-4 py-3 font-medium text-gray-600 w-16">
                                            { __( 'Hits', 'snel-seo' ) }
                                        </th>
                                        <th className="w-12" />
                                    </tr>
                                </thead>
                                <tbody>
                                    { paginated.map( ( r ) => (
                                        <tr key={ r.id } className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-4 py-3 font-mono text-xs text-gray-700 break-all">
                                                { r.source_url }
                                                { !! parseInt( r.is_pattern ) && (
                                                    <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-semibold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                                                        <Asterisk size={ 10 } />
                                                        pattern
                                                    </span>
                                                ) }
                                            </td>
                                            <td className="text-center">
                                                <ArrowRight size={ 14 } className="text-gray-300" />
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-blue-600 break-all">
                                                { r.target_url }
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                    { r.type }
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs text-gray-500">
                                                { r.hits }
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center gap-1 justify-center">
                                                    <button
                                                        onClick={ () => openEdit( r ) }
                                                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors rounded hover:bg-blue-50"
                                                    >
                                                        <Pencil size={ 14 } />
                                                    </button>
                                                    <button
                                                        onClick={ () => handleDelete( r.id ) }
                                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-red-50"
                                                    >
                                                        <Trash2 size={ 14 } />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) ) }
                                </tbody>
                            </table>

                            {/* Pagination */}
                            { totalPages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                                    <span className="text-xs text-gray-500">
                                        { __( 'Showing', 'snel-seo' ) } { ( currentPage - 1 ) * perPage + 1 }–{ Math.min( currentPage * perPage, filtered.length ) } { __( 'of', 'snel-seo' ) } { filtered.length }
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={ () => setCurrentPage( ( p ) => Math.max( 1, p - 1 ) ) }
                                            disabled={ currentPage === 1 }
                                            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft size={ 14 } />
                                        </button>
                                        <span className="text-xs text-gray-600 px-2">
                                            { currentPage } / { totalPages }
                                        </span>
                                        <button
                                            onClick={ () => setCurrentPage( ( p ) => Math.min( totalPages, p + 1 ) ) }
                                            disabled={ currentPage === totalPages }
                                            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronRight size={ 14 } />
                                        </button>
                                    </div>
                                </div>
                            ) }
                        </div>
                    ) }
                </>
            ) }

            { activeTab === '404-log' && (
                <FourOhFourLog onAddRedirect={ ( url ) => openAdd( url ) } />
            ) }

            {/* Add/Edit Redirect Modal */}
            { showModal && (
                <Modal
                    title={ editingId ? __( 'Edit Redirect', 'snel-seo' ) : __( 'Add Redirect', 'snel-seo' ) }
                    onRequestClose={ () => { setShowModal( false ); setEditingId( null ); } }
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                { __( 'Source URL (old path)', 'snel-seo' ) }
                            </label>
                            <input
                                type="text"
                                value={ sourceUrl }
                                onChange={ ( e ) => setSourceUrl( e.target.value ) }
                                placeholder={ isPattern ? '/category/pagina/*' : '/old-page-slug' }
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_1px_#3b82f6]"
                            />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={ isPattern }
                                onChange={ ( e ) => setIsPattern( e.target.checked ) }
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{ __( 'Wildcard pattern', 'snel-seo' ) }</span>
                            <span className="text-xs text-gray-400">{ __( 'matches all URLs starting with this path', 'snel-seo' ) }</span>
                        </label>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                { __( 'Target URL (new destination)', 'snel-seo' ) }
                            </label>
                            <input
                                type="text"
                                value={ targetUrl }
                                onChange={ ( e ) => setTargetUrl( e.target.value ) }
                                placeholder="https://example.com/new-page"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_1px_#3b82f6]"
                            />
                        </div>
                        <div>
                            <SelectControl
                                label={ __( 'Redirect Type', 'snel-seo' ) }
                                value={ redirectType }
                                options={ [
                                    { label: '301 — Permanent', value: '301' },
                                    { label: '302 — Temporary', value: '302' },
                                ] }
                                onChange={ setRedirectType }
                                __nextHasNoMarginBottom
                            />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                onClick={ () => { setShowModal( false ); setEditingId( null ); } }
                                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                { __( 'Cancel', 'snel-seo' ) }
                            </button>
                            <button
                                onClick={ handleSave }
                                disabled={ saving || ! sourceUrl || ! targetUrl }
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                                { saving && <Loader2 size={ 14 } className="animate-spin" /> }
                                { editingId ? __( 'Save Changes', 'snel-seo' ) : __( 'Add Redirect', 'snel-seo' ) }
                            </button>
                        </div>
                    </div>
                </Modal>
            ) }

            {/* Test Redirects Modal */}
            { showTestModal && (
                <Modal
                    title={ __( 'Test Redirects', 'snel-seo' ) }
                    onRequestClose={ () => setShowTestModal( false ) }
                    className="snel-seo-test-modal"
                    style={ { maxWidth: '800px', width: '100%' } }
                >
                    <div className="space-y-4">
                        {/* Input phase — show when no results yet and not running */ }
                        { testResults.length === 0 && ! testRunning && (
                            <>
                                <p className="text-sm text-gray-500">
                                    { __( 'Paste URLs, type them, or drop a JSON file to test.', 'snel-seo' ) }
                                </p>
                                <div
                                    className={ `relative rounded-lg transition-colors ${ dragOver ? 'ring-2 ring-purple-400 bg-purple-50' : '' }` }
                                    onDragOver={ ( e ) => { e.preventDefault(); setDragOver( true ); } }
                                    onDragLeave={ () => setDragOver( false ) }
                                    onDrop={ handleTestFileDrop }
                                >
                                    { dragOver && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-purple-50/90 rounded-lg z-10 pointer-events-none">
                                            <span className="text-sm font-medium text-purple-600">{ __( 'Drop JSON file here', 'snel-seo' ) }</span>
                                        </div>
                                    ) }
                                    <textarea
                                        value={ testInput }
                                        onChange={ ( e ) => setTestInput( e.target.value ) }
                                        placeholder={ '/old-page-1\n/old-page-2\nhttp://antiquewarehouse.nl/producten/show/123\n\nOr drag & drop a JSON file here...' }
                                        rows={ 10 }
                                        className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:shadow-[0_0_0_1px_#a855f7] resize-y"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-400">
                                            { testInput.trim() ? `${ testInput.trim().split( '\n' ).filter( Boolean ).length } URLs` : '' }
                                        </span>
                                        <label className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700 cursor-pointer transition-colors">
                                            <Upload size={ 12 } />
                                            { __( 'Load JSON file', 'snel-seo' ) }
                                            <input type="file" accept=".json,.txt,.csv" onChange={ handleTestFileInput } className="hidden" />
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={ () => {
                                                const allUrls = redirects.map( ( r ) => r.source_url );
                                                if ( ! allUrls.length ) return;
                                                setTestInput( allUrls.join( '\n' ) );
                                            } }
                                            disabled={ ! redirects.length }
                                            className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-30"
                                        >
                                            { __( 'Load All Redirects', 'snel-seo' ) }
                                        </button>
                                        <button
                                            onClick={ () => {
                                                const urls = testInput.trim().split( '\n' ).map( ( u ) => u.trim() ).filter( Boolean );
                                                handleTestRedirects( urls );
                                            } }
                                            disabled={ ! testInput.trim() }
                                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <FlaskConical size={ 14 } />
                                            { __( 'Run Test', 'snel-seo' ) }
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) }

                        {/* Progress bar */ }
                        { testRunning && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2 text-purple-600">
                                        <Loader2 size={ 14 } className="animate-spin" />
                                        { __( 'Testing redirects...', 'snel-seo' ) }
                                    </span>
                                    <span className="text-gray-500 font-mono">
                                        { testProgress.done } / { testProgress.total }
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                                        style={ { width: `${ testProgress.total ? ( testProgress.done / testProgress.total ) * 100 : 0 }%` } }
                                    />
                                </div>
                                { testResults.length > 0 && (
                                    <div className="flex items-center gap-4 text-xs">
                                        <span className="flex items-center gap-1 text-emerald-600">
                                            <CheckCircle2 size={ 12 } /> { testOkCount } { __( 'working', 'snel-seo' ) }
                                        </span>
                                        <span className="flex items-center gap-1 text-red-500">
                                            <XCircle size={ 12 } /> { testFailCount } { __( 'missing', 'snel-seo' ) }
                                        </span>
                                    </div>
                                ) }
                            </div>
                        ) }

                        {/* Results phase */ }
                        { ! testRunning && testResults.length > 0 && (
                            <>
                                {/* Summary */ }
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                                            <CheckCircle2 size={ 16 } /> { testOkCount } { __( 'working', 'snel-seo' ) }
                                        </span>
                                        <span className="flex items-center gap-1.5 text-red-500 font-medium">
                                            <XCircle size={ 16 } /> { testFailCount } { __( 'missing', 'snel-seo' ) }
                                        </span>
                                    </div>
                                    <button
                                        onClick={ () => { setTestResults( [] ); setTestInput( '' ); } }
                                        className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        { __( 'New Test', 'snel-seo' ) }
                                    </button>
                                </div>

                                {/* Filters + Search */ }
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                                        { [ 'all', 'ok', 'missing' ].map( ( f ) => (
                                            <button
                                                key={ f }
                                                onClick={ () => { setTestFilter( f ); setTestPage( 1 ); } }
                                                className={ `px-3 py-1 text-xs font-medium rounded-md transition-colors ${ testFilter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700' }` }
                                            >
                                                { f === 'all' ? `${ __( 'All', 'snel-seo' ) } (${ testResults.length })` : f === 'ok' ? `${ __( 'Working', 'snel-seo' ) } (${ testOkCount })` : `${ __( 'Missing', 'snel-seo' ) } (${ testFailCount })` }
                                            </button>
                                        ) ) }
                                    </div>
                                    <div className="flex-1 relative">
                                        <Search size={ 12 } className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={ testSearchQuery }
                                            onChange={ ( e ) => { setTestSearchQuery( e.target.value ); setTestPage( 1 ); } }
                                            placeholder={ __( 'Search URLs...', 'snel-seo' ) }
                                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:shadow-[0_0_0_1px_#a855f7]"
                                        />
                                    </div>
                                </div>

                                {/* Results table */ }
                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 z-10">
                                            <tr className="border-b border-gray-200 bg-gray-50">
                                                <th className="w-8 px-3 py-2" />
                                                <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">
                                                    { __( 'URL', 'snel-seo' ) }
                                                </th>
                                                <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs">
                                                    { __( 'Redirects to', 'snel-seo' ) }
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            { testPaginated.map( ( r, i ) => (
                                                <tr key={ i } className={ `border-b border-gray-50 ${ r.status === 'missing' ? 'bg-red-50/50' : '' }` }>
                                                    <td className="px-3 py-2 text-center">
                                                        { r.status === 'ok'
                                                            ? <CheckCircle2 size={ 14 } className="text-emerald-500" />
                                                            : <XCircle size={ 14 } className="text-red-400" />
                                                        }
                                                    </td>
                                                    <td className="px-3 py-2 font-mono text-xs text-gray-700 break-all">
                                                        { r.url }
                                                        { r.pattern && (
                                                            <span className="ml-1.5 text-[10px] text-purple-600 bg-purple-50 px-1 py-0.5 rounded">
                                                                { r.pattern }
                                                            </span>
                                                        ) }
                                                    </td>
                                                    <td className="px-3 py-2 font-mono text-xs break-all">
                                                        { r.target
                                                            ? <span className="text-blue-600">{ r.target }</span>
                                                            : <span className="text-red-400 italic">{ __( 'No redirect found', 'snel-seo' ) }</span>
                                                        }
                                                    </td>
                                                </tr>
                                            ) ) }
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */ }
                                { testTotalPages > 1 && (
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>
                                            { __( 'Showing', 'snel-seo' ) } { ( testPage - 1 ) * testPerPage + 1 }–{ Math.min( testPage * testPerPage, testFiltered.length ) } { __( 'of', 'snel-seo' ) } { testFiltered.length }
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={ () => setTestPage( ( p ) => Math.max( 1, p - 1 ) ) }
                                                disabled={ testPage === 1 }
                                                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors"
                                            >
                                                <ChevronLeft size={ 12 } />
                                            </button>
                                            <span className="px-2">{ testPage } / { testTotalPages }</span>
                                            <button
                                                onClick={ () => setTestPage( ( p ) => Math.min( testTotalPages, p + 1 ) ) }
                                                disabled={ testPage === testTotalPages }
                                                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 transition-colors"
                                            >
                                                <ChevronRight size={ 12 } />
                                            </button>
                                        </div>
                                    </div>
                                ) }
                            </>
                        ) }
                    </div>
                </Modal>
            ) }
        </div>
    );
}
