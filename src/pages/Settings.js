import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Globe, Home, FileText, PenTool, Save, Image, X } from 'lucide-react';
import TemplateInput from '../components/TemplateInput';
import GooglePreview from '../components/GooglePreview';
import Tabs from '../components/Tabs';

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

            <Tabs tabs={ TABS } active={ activeTab } onChange={ setActiveTab } />

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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_1px_#3b82f6]"
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
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                { __( 'Default Social Image', 'snel-seo' ) }
                            </label>
                            <p className="text-xs text-gray-400 mb-2">
                                { __( 'Used when a page has no featured image. Recommended: 1200x630px.', 'snel-seo' ) }
                            </p>
                            { settings.default_og_image ? (
                                <div className="relative inline-block">
                                    <img
                                        src={ settings.default_og_image }
                                        alt=""
                                        className="max-w-[300px] h-auto rounded-lg border border-gray-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={ () => update( 'default_og_image', '' ) }
                                        className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full border border-gray-300 flex items-center justify-center hover:bg-red-50 hover:border-red-300 transition-colors"
                                    >
                                        <X size={ 12 } className="text-gray-500" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={ () => {
                                        const frame = wp.media( {
                                            title: __( 'Select Default Social Image', 'snel-seo' ),
                                            multiple: false,
                                            library: { type: 'image' },
                                        } );
                                        frame.on( 'select', () => {
                                            const attachment = frame.state().get( 'selection' ).first().toJSON();
                                            update( 'default_og_image', attachment.url );
                                        } );
                                        frame.open();
                                    } }
                                    className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                                >
                                    <Image size={ 16 } />
                                    { __( 'Select Image', 'snel-seo' ) }
                                </button>
                            ) }
                        </div>
                    </div>
                ) }

                { activeTab === 'homepage' && (
                    <div className="space-y-6">
                        <TemplateInput
                            label={ __( 'SEO Title', 'snel-seo' ) }
                            value={ settings.title_home }
                            onChange={ ( v ) => update( 'title_home', v ) }
                            badgeGroup="homepage"
                            defaultValue="%%sitename%% %%separator%% %%sitedesc%%"
                        />
                        <TemplateInput
                            label={ __( 'Meta Description', 'snel-seo' ) }
                            value={ settings.metadesc_home }
                            onChange={ ( v ) => update( 'metadesc_home', v ) }
                            badgeGroup="homepage"
                            maxLength={ 160 }
                        />
                        <GooglePreview
                            title={ resolveTemplate( settings.title_home || '%%sitename%% %%separator%% %%sitedesc%%', previewVars ) }
                            url={ window.snelSeo?.siteUrl }
                            description={ settings.metadesc_home }
                        />
                    </div>
                ) }

                { activeTab === 'pages' && (
                    <div className="space-y-6">
                        <TemplateInput
                            label={ __( 'SEO Title Template', 'snel-seo' ) }
                            value={ settings.title_page }
                            onChange={ ( v ) => update( 'title_page', v ) }
                            badgeGroup="page"
                            defaultValue="%%title%% %%separator%% %%sitename%%"
                        />
                        <TemplateInput
                            label={ __( 'Default Meta Description', 'snel-seo' ) }
                            value={ settings.metadesc_page }
                            onChange={ ( v ) => update( 'metadesc_page', v ) }
                            badgeGroup="page"
                            maxLength={ 160 }
                        />
                        <GooglePreview
                            title={ resolveTemplate( settings.title_page || '%%title%% %%separator%% %%sitename%%', previewVars ) }
                            url={ window.snelSeo?.siteUrl + '/example-page/' }
                            description={ settings.metadesc_page }
                        />
                    </div>
                ) }

                { activeTab === 'posts' && (
                    <div className="space-y-6">
                        <TemplateInput
                            label={ __( 'SEO Title Template', 'snel-seo' ) }
                            value={ settings.title_post }
                            onChange={ ( v ) => update( 'title_post', v ) }
                            badgeGroup="post"
                            defaultValue="%%title%% %%separator%% %%sitename%%"
                        />
                        <TemplateInput
                            label={ __( 'Default Meta Description', 'snel-seo' ) }
                            value={ settings.metadesc_post }
                            onChange={ ( v ) => update( 'metadesc_post', v ) }
                            badgeGroup="post"
                            maxLength={ 160 }
                        />
                        <GooglePreview
                            title={ resolveTemplate( settings.title_post || '%%title%% %%separator%% %%sitename%%', previewVars ) }
                            url={ window.snelSeo?.siteUrl + '/example-post/' }
                            description={ settings.metadesc_post }
                        />
                    </div>
                ) }
            </div>
        </div>
    );
}
