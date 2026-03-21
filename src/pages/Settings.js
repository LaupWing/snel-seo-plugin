import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Globe, Home, FileText, PenTool, Save } from 'lucide-react';

const SEPARATORS = [
    { label: '–', value: 'sc-dash' },
    { label: '-', value: 'sc-hyphen' },
    { label: '|', value: 'sc-pipe' },
    { label: '·', value: 'sc-middot' },
    { label: '•', value: 'sc-bullet' },
    { label: '»', value: 'sc-raquo' },
    { label: '/', value: 'sc-slash' },
];

function getSeparatorChar( value ) {
    const sep = SEPARATORS.find( ( s ) => s.value === value );
    return sep ? sep.label : '–';
}

function resolveTemplate( template, vars ) {
    let result = template;
    Object.keys( vars ).forEach( ( key ) => {
        result = result.replace( new RegExp( `%%${ key }%%`, 'g' ), vars[ key ] );
    } );
    return result;
}

const TABS = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'homepage', label: 'Homepage', icon: Home },
    { id: 'pages', label: 'Pages', icon: FileText },
    { id: 'posts', label: 'Posts', icon: PenTool },
];

export default function Settings() {
    const initial = window.snelSeo?.settings || {};
    const [ settings, setSettings ] = useState( initial );
    const [ saving, setSaving ] = useState( false );
    const [ notice, setNotice ] = useState( null );
    const [ activeTab, setActiveTab ] = useState( 'general' );

    const update = ( key, value ) => {
        setSettings( ( prev ) => ( { ...prev, [ key ]: value } ) );
    };

    const handleSave = async () => {
        setSaving( true );
        setNotice( null );

        try {
            const res = await fetch( `${ window.snelSeo.restUrl }/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window.snelSeo.nonce,
                },
                body: JSON.stringify( settings ),
            } );

            setNotice( res.ok
                ? { type: 'success', message: __( 'Settings saved.', 'snel-seo' ) }
                : { type: 'error', message: __( 'Failed to save settings.', 'snel-seo' ) }
            );
        } catch {
            setNotice( { type: 'error', message: __( 'Network error.', 'snel-seo' ) } );
        }

        setSaving( false );
    };

    const sepChar = getSeparatorChar( settings.separator );
    const previewVars = {
        sitename: settings.website_name || window.snelSeo?.siteName || '',
        sitedesc: window.snelSeo?.siteDesc || '',
        separator: sepChar,
        title: __( 'Example Page', 'snel-seo' ),
    };

    return (
        <div className="p-6">
            {/* Header */ }
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">
                        SEO <em className="font-serif font-normal italic">Settings</em>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        { __( 'Configure how your site appears in search results', 'snel-seo' ) }
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

            {/* Notice */ }
            { notice && (
                <div className={ `mb-4 px-4 py-3 rounded-lg text-sm ${ notice.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200' }` }>
                    { notice.message }
                    <button onClick={ () => setNotice( null ) } className="float-right font-bold">×</button>
                </div>
            ) }

            {/* Tabs */ }
            <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
                { TABS.map( ( tab ) => (
                    <button
                        key={ tab.id }
                        onClick={ () => setActiveTab( tab.id ) }
                        className={ `flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${ activeTab === tab.id
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }` }
                    >
                        <tab.icon size={ 16 } />
                        { tab.label }
                    </button>
                ) ) }
            </div>

            {/* Tab content */ }
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                { activeTab === 'general' && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                { __( 'Website Name', 'snel-seo' ) }
                            </label>
                            <input
                                type="text"
                                value={ settings.website_name || '' }
                                onChange={ ( e ) => update( 'website_name', e.target.value ) }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                { __( 'Used in title templates as %%sitename%%', 'snel-seo' ) }
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                { __( 'Title Separator', 'snel-seo' ) }
                            </label>
                            <div className="flex gap-2">
                                { SEPARATORS.map( ( sep ) => (
                                    <button
                                        key={ sep.value }
                                        onClick={ () => update( 'separator', sep.value ) }
                                        className={ `w-10 h-10 flex items-center justify-center rounded-lg border text-lg transition-colors ${ settings.separator === sep.value
                                            ? 'border-blue-600 bg-blue-50 text-blue-600'
                                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                        }` }
                                    >
                                        { sep.label }
                                    </button>
                                ) ) }
                            </div>
                        </div>
                    </div>
                ) }

                { activeTab === 'homepage' && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                { __( 'SEO Title', 'snel-seo' ) }
                            </label>
                            <input
                                type="text"
                                value={ settings.title_home || '' }
                                onChange={ ( e ) => update( 'title_home', e.target.value ) }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                { __( 'Variables: %%sitename%%, %%sitedesc%%, %%separator%%', 'snel-seo' ) }
                            </p>
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-400 mb-1">{ __( 'Preview:', 'snel-seo' ) }</p>
                                <p className="text-sm font-medium text-blue-700">
                                    { resolveTemplate( settings.title_home || '%%sitename%% %%separator%% %%sitedesc%%', previewVars ) }
                                </p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                { __( 'Meta Description', 'snel-seo' ) }
                            </label>
                            <textarea
                                value={ settings.metadesc_home || '' }
                                onChange={ ( e ) => update( 'metadesc_home', e.target.value ) }
                                rows={ 3 }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />
                            { settings.metadesc_home && (
                                <p className={ `mt-1 text-xs ${ settings.metadesc_home.length > 160 ? 'text-red-500' : 'text-gray-400' }` }>
                                    { settings.metadesc_home.length } / 160 { __( 'characters', 'snel-seo' ) }
                                </p>
                            ) }
                        </div>
                    </div>
                ) }

                { activeTab === 'pages' && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                { __( 'SEO Title Template', 'snel-seo' ) }
                            </label>
                            <input
                                type="text"
                                value={ settings.title_page || '' }
                                onChange={ ( e ) => update( 'title_page', e.target.value ) }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                { __( 'Variables: %%title%%, %%sitename%%, %%separator%%', 'snel-seo' ) }
                            </p>
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-400 mb-1">{ __( 'Preview:', 'snel-seo' ) }</p>
                                <p className="text-sm font-medium text-blue-700">
                                    { resolveTemplate( settings.title_page || '%%title%% %%separator%% %%sitename%%', previewVars ) }
                                </p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                { __( 'Default Meta Description', 'snel-seo' ) }
                            </label>
                            <textarea
                                value={ settings.metadesc_page || '' }
                                onChange={ ( e ) => update( 'metadesc_page', e.target.value ) }
                                rows={ 3 }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                { __( 'Used when a page has no custom meta description.', 'snel-seo' ) }
                            </p>
                        </div>
                    </div>
                ) }

                { activeTab === 'posts' && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                { __( 'SEO Title Template', 'snel-seo' ) }
                            </label>
                            <input
                                type="text"
                                value={ settings.title_post || '' }
                                onChange={ ( e ) => update( 'title_post', e.target.value ) }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                { __( 'Variables: %%title%%, %%sitename%%, %%separator%%', 'snel-seo' ) }
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                { __( 'Default Meta Description', 'snel-seo' ) }
                            </label>
                            <textarea
                                value={ settings.metadesc_post || '' }
                                onChange={ ( e ) => update( 'metadesc_post', e.target.value ) }
                                rows={ 3 }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            />
                        </div>
                    </div>
                ) }
            </div>
        </div>
    );
}
