import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Map, Save, Loader2, ExternalLink, Eye, EyeOff, Search } from 'lucide-react';
import Select from '../components/Select';

export default function Sitemap() {
    const [ settings, setSettings ] = useState( null );
    const [ entries, setEntries ] = useState( [] );
    const [ loading, setLoading ] = useState( true );
    const [ saving, setSaving ] = useState( false );
    const [ notice, setNotice ] = useState( null );
    const [ search, setSearch ] = useState( '' );
    const [ typeFilter, setTypeFilter ] = useState( 'all' );

    const fetchData = async () => {
        try {
            const [ settingsRes, previewRes ] = await Promise.all( [
                fetch( `${ window.snelSeo.restUrl }/sitemap/settings`, {
                    headers: { 'X-WP-Nonce': window.snelSeo.nonce },
                } ),
                fetch( `${ window.snelSeo.restUrl }/sitemap/preview`, {
                    headers: { 'X-WP-Nonce': window.snelSeo.nonce },
                } ),
            ] );
            const s = await settingsRes.json();
            const e = await previewRes.json();
            setSettings( s );
            setEntries( Array.isArray( e ) ? e : [] );
        } catch {
            setNotice( { type: 'error', message: __( 'Failed to load sitemap data.', 'snel-seo' ) } );
        }
        setLoading( false );
    };

    useEffect( () => { fetchData(); }, [] );

    const handleSave = async () => {
        setSaving( true );
        setNotice( null );
        try {
            const res = await fetch( `${ window.snelSeo.restUrl }/sitemap/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.snelSeo.nonce },
                body: JSON.stringify( settings ),
            } );
            if ( res.ok ) {
                setNotice( { type: 'success', message: __( 'Sitemap settings saved.', 'snel-seo' ) } );
                fetchData();
            } else {
                setNotice( { type: 'error', message: __( 'Failed to save.', 'snel-seo' ) } );
            }
        } catch {
            setNotice( { type: 'error', message: __( 'Network error.', 'snel-seo' ) } );
        }
        setSaving( false );
    };

    const toggleExclude = ( id ) => {
        setSettings( ( prev ) => {
            const excluded = [ ...( prev.excluded_ids || [] ) ];
            const idx = excluded.indexOf( id );
            if ( idx >= 0 ) {
                excluded.splice( idx, 1 );
            } else {
                excluded.push( id );
            }
            return { ...prev, excluded_ids: excluded };
        } );
    };

    const update = ( key, value ) => {
        setSettings( ( prev ) => ( { ...prev, [ key ]: value } ) );
    };

    if ( loading || ! settings ) {
        return (
            <div className="p-6 flex items-center gap-2 text-sm text-gray-400">
                <Loader2 size={ 14 } className="animate-spin" />
                { __( 'Loading...', 'snel-seo' ) }
            </div>
        );
    }

    const sitemapUrl = settings.enabled
        ? `${ window.snelSeo.siteUrl }/sitemap.xml`
        : `${ window.snelSeo.siteUrl }/wp-sitemap.xml`;

    // Filter entries for display.
    const filtered = entries.filter( ( e ) => {
        if ( typeFilter !== 'all' && e.type !== typeFilter ) return false;
        if ( search && ! e.title.toLowerCase().includes( search.toLowerCase() ) && ! e.url.toLowerCase().includes( search.toLowerCase() ) ) return false;
        return true;
    } );

    const includedCount = entries.filter( ( e ) => ! e.excluded ).length;
    const excludedCount = entries.filter( ( e ) => e.excluded ).length;

    const types = [ ...new Set( entries.map( ( e ) => e.type ) ) ];

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">
                        XML <em className="font-serif font-normal italic">Sitemap</em>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        { __( 'Configure your XML sitemap for search engines.', 'snel-seo' ) }
                    </p>
                </div>
                <button
                    onClick={ handleSave }
                    disabled={ saving }
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    <Save size={ 16 } />
                    { saving ? __( 'Saving...', 'snel-seo' ) : __( 'Save Settings', 'snel-seo' ) }
                </button>
            </div>

            {/* Notice */}
            { notice && (
                <div className={ `mb-4 px-4 py-3 rounded-lg text-sm ${ notice.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200' }` }>
                    { notice.message }
                    <button onClick={ () => setNotice( null ) } className="float-right font-bold">×</button>
                </div>
            ) }

            {/* Sitemap mode */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Map size={ 16 } className="text-blue-600" />
                    </div>
                    <h2 className="text-sm font-semibold text-gray-900">
                        { __( 'Sitemap Mode', 'snel-seo' ) }
                    </h2>
                </div>

                <div className="flex gap-3 mb-4">
                    <button
                        type="button"
                        onClick={ () => update( 'enabled', false ) }
                        className={ `flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${ ! settings.enabled
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }` }
                    >
                        { __( 'WordPress Default', 'snel-seo' ) }
                        <p className="text-xs font-normal mt-1 opacity-70">
                            { __( 'Uses /wp-sitemap.xml — automatic, no config needed', 'snel-seo' ) }
                        </p>
                    </button>
                    <button
                        type="button"
                        onClick={ () => update( 'enabled', true ) }
                        className={ `flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${ settings.enabled
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }` }
                    >
                        { __( 'Custom Sitemap', 'snel-seo' ) }
                        <p className="text-xs font-normal mt-1 opacity-70">
                            { __( 'Uses /sitemap.xml — exclude pages, control content types', 'snel-seo' ) }
                        </p>
                    </button>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{ __( 'Active sitemap:', 'snel-seo' ) }</span>
                    <a
                        href={ sitemapUrl }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                        { sitemapUrl }
                        <ExternalLink size={ 12 } />
                    </a>
                </div>
            </div>

            {/* Custom sitemap settings */}
            { settings.enabled && (
                <>
                    {/* Content type toggles */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
                        <h2 className="text-sm font-semibold text-gray-900 mb-4">
                            { __( 'Include in Sitemap', 'snel-seo' ) }
                        </h2>
                        <div className="flex gap-6">
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={ settings.include_pages }
                                    onChange={ ( e ) => update( 'include_pages', e.target.checked ) }
                                    className="rounded"
                                />
                                { __( 'Pages', 'snel-seo' ) }
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={ settings.include_posts }
                                    onChange={ ( e ) => update( 'include_posts', e.target.checked ) }
                                    className="rounded"
                                />
                                { __( 'Posts', 'snel-seo' ) }
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={ settings.include_products }
                                    onChange={ ( e ) => update( 'include_products', e.target.checked ) }
                                    className="rounded"
                                />
                                { __( 'Products', 'snel-seo' ) }
                            </label>
                        </div>
                    </div>

                    {/* URL preview + exclude */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-gray-900">
                                { __( 'Sitemap URLs', 'snel-seo' ) }
                                <span className="ml-2 text-xs font-normal text-gray-400">
                                    { `${ includedCount } included, ${ excludedCount } excluded` }
                                </span>
                            </h2>
                        </div>

                        {/* Filters */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="relative flex-1">
                                <Search size={ 14 } className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={ __( 'Search pages...', 'snel-seo' ) }
                                    value={ search }
                                    onChange={ ( e ) => setSearch( e.target.value ) }
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_1px_#3b82f6]"
                                />
                            </div>
                            <Select
                                value={ typeFilter }
                                onChange={ setTypeFilter }
                                options={ [
                                    { value: 'all', label: __( 'All types', 'snel-seo' ) },
                                    ...types.map( ( t ) => ( { value: t, label: t.charAt( 0 ).toUpperCase() + t.slice( 1 ) + 's' } ) ),
                                ] }
                            />
                        </div>

                        {/* Table */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            { __( 'Page', 'snel-seo' ) }
                                        </th>
                                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                                            { __( 'Type', 'snel-seo' ) }
                                        </th>
                                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                                            { __( 'Modified', 'snel-seo' ) }
                                        </th>
                                        <th className="text-center px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                                            { __( 'Include', 'snel-seo' ) }
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    { filtered.map( ( entry ) => {
                                        const isExcluded = ( settings.excluded_ids || [] ).includes( entry.id );
                                        return (
                                            <tr key={ entry.id } className={ isExcluded ? 'bg-gray-50 opacity-60' : '' }>
                                                <td className="px-4 py-2.5">
                                                    <div className="font-medium text-gray-900">{ entry.title }</div>
                                                    <div className="text-xs text-gray-400 truncate max-w-md">{ entry.url }</div>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                        { entry.type }
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-xs text-gray-500">
                                                    { entry.modified }
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={ () => toggleExclude( entry.id ) }
                                                        className={ `p-1 rounded transition-colors ${ isExcluded
                                                            ? 'text-red-400 hover:text-red-600'
                                                            : 'text-emerald-500 hover:text-emerald-700'
                                                        }` }
                                                        title={ isExcluded ? __( 'Click to include', 'snel-seo' ) : __( 'Click to exclude', 'snel-seo' ) }
                                                    >
                                                        { isExcluded ? <EyeOff size={ 16 } /> : <Eye size={ 16 } /> }
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    } ) }
                                    { filtered.length === 0 && (
                                        <tr>
                                            <td colSpan={ 4 } className="px-4 py-8 text-center text-gray-400 text-sm">
                                                { __( 'No pages found.', 'snel-seo' ) }
                                            </td>
                                        </tr>
                                    ) }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) }
        </div>
    );
}
