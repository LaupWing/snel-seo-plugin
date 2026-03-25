import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Globe, Home, FileText, PenTool, Save, Image, X, Languages } from 'lucide-react';
import { Tooltip } from '@wordpress/components';
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

/**
 * Get value for a multilingual setting key.
 * Settings can be either a plain string (legacy) or a JSON object keyed by lang code.
 */
function getLangValue( settings, key, lang ) {
    const val = settings[ key ];
    if ( ! val ) return '';
    if ( typeof val === 'object' ) return val[ lang ] || '';
    // Legacy plain string — treat as default language value
    return lang === defaultLangGlobal ? val : '';
}

function setLangValue( settings, key, lang, value ) {
    const current = settings[ key ];
    if ( typeof current === 'object' && current !== null ) {
        return { ...current, [ lang ]: value };
    }
    // Migrate from plain string to object
    const obj = {};
    if ( current && typeof current === 'string' ) {
        obj[ defaultLangGlobal ] = current;
    }
    obj[ lang ] = value;
    return obj;
}

// Will be set once in the component
let defaultLangGlobal = 'nl';

const TABS = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'homepage', label: 'Homepage', icon: Home },
    { id: 'pages', label: 'Pages', icon: FileText },
    { id: 'posts', label: 'Posts', icon: PenTool },
];

// Keys that should be multilingual
const MULTILINGUAL_KEYS = [ 'title_home', 'metadesc_home', 'title_page', 'metadesc_page', 'title_post', 'metadesc_post' ];

export default function Settings() {
    const initial = window.snelSeo?.settings || {};
    const [ settings, setSettings ] = useState( initial );
    const [ saving, setSaving ] = useState( false );
    const [ notice, setNotice ] = useState( null );
    const [ activeTab, setActiveTab ] = useState( 'general' );

    const isMultilingual = window.snelSeo?.multilingual || false;
    const languages = window.snelSeo?.languages || [];
    const defaultLang = window.snelSeo?.defaultLang || 'nl';
    defaultLangGlobal = defaultLang;
    const [ activeLang, setActiveLang ] = useState( defaultLang );

    // Pre-fill empty languages with default language values on mount.
    useState( () => {
        if ( ! isMultilingual ) return;
        const defaults = {
            title_home: '%%sitename%% %%separator%% %%sitedesc%%',
            metadesc_home: '',
            title_page: '%%title%% %%separator%% %%sitename%%',
            metadesc_page: '',
            title_post: '%%title%% %%separator%% %%sitename%%',
            metadesc_post: '',
        };
        setSettings( ( prev ) => {
            const next = { ...prev };
            let changed = false;
            for ( const key of MULTILINGUAL_KEYS ) {
                const val = next[ key ];
                const obj = ( typeof val === 'object' && val !== null ) ? { ...val } : {};
                // Ensure default lang has a value
                if ( ! obj[ defaultLang ] && defaults[ key ] ) {
                    obj[ defaultLang ] = defaults[ key ];
                }
                // Fill other languages with default lang value
                const source = obj[ defaultLang ] || defaults[ key ];
                if ( source ) {
                    for ( const lang of languages ) {
                        if ( ! obj[ lang.code ] ) {
                            obj[ lang.code ] = source;
                            changed = true;
                        }
                    }
                }
                next[ key ] = obj;
            }
            return changed ? next : prev;
        } );
    } );

    // Translate All state
    const [ translatingAll, setTranslatingAll ] = useState( false );
    const [ btnText, setBtnText ] = useState( null );
    const [ btnAnimStyle, setBtnAnimStyle ] = useState( {} );

    const update = ( key, value ) => {
        if ( MULTILINGUAL_KEYS.includes( key ) && isMultilingual ) {
            setSettings( ( prev ) => ( {
                ...prev,
                [ key ]: setLangValue( prev, key, activeLang, value ),
            } ) );
        } else {
            setSettings( ( prev ) => ( { ...prev, [ key ]: value } ) );
        }
    };

    const getVal = ( key ) => {
        if ( MULTILINGUAL_KEYS.includes( key ) && isMultilingual ) {
            return getLangValue( settings, key, activeLang );
        }
        const val = settings[ key ];
        if ( typeof val === 'object' && val !== null ) return val[ defaultLang ] || '';
        return val || '';
    };

    // Slide animation for Translate All button text
    const animateBtnText = ( text ) => {
        return new Promise( ( resolve ) => {
            setBtnAnimStyle( { transform: 'translateY(-100%)', opacity: 0, transition: 'all 0.2s ease-in' } );
            setTimeout( () => {
                setBtnText( text );
                setBtnAnimStyle( { transform: 'translateY(100%)', opacity: 0, transition: 'none' } );
                requestAnimationFrame( () => {
                    requestAnimationFrame( () => {
                        setBtnAnimStyle( { transform: 'translateY(0)', opacity: 1, transition: 'all 0.25s ease-out' } );
                        setTimeout( resolve, 250 );
                    } );
                } );
            }, 200 );
        } );
    };

    // Translate All — translate settings templates to all non-default languages
    const handleTranslateAll = async () => {
        setTranslatingAll( true );
        const otherLangs = languages.filter( ( l ) => l.code !== defaultLang );

        // Determine which tab's keys to translate
        const tabKeys = {
            homepage: [ 'title_home', 'metadesc_home' ],
            pages: [ 'title_page', 'metadesc_page' ],
            posts: [ 'title_post', 'metadesc_post' ],
        };
        const keysToTranslate = tabKeys[ activeTab ] || [];

        for ( const lang of otherLangs ) {
            await animateBtnText( `✦ Translating ${ lang.label }...` );

            for ( const key of keysToTranslate ) {
                const sourceText = getLangValue( settings, key, defaultLang );
                if ( ! sourceText ) continue;

                try {
                    const res = await fetch( `${ window.snelSeo.restUrl }/settings/translate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.snelSeo.nonce },
                        body: JSON.stringify( { text: sourceText, lang: lang.code, type: key.startsWith( 'title' ) ? 'title' : 'description' } ),
                    } );
                    const data = await res.json();
                    if ( data.result ) {
                        setSettings( ( prev ) => ( {
                            ...prev,
                            [ key ]: setLangValue( prev, key, lang.code, data.result ),
                        } ) );
                    }
                } catch {
                    // Continue with next key
                }
            }

            await animateBtnText( `${ lang.label } ✓` );
            await new Promise( ( r ) => setTimeout( r, 500 ) );
        }

        await animateBtnText( 'All done ✓' );
        await new Promise( ( r ) => setTimeout( r, 1200 ) );
        setBtnText( null );
        setBtnAnimStyle( {} );
        setTranslatingAll( false );
    };

    // Count missing translations for current tab
    const tabKeys = {
        homepage: [ 'title_home', 'metadesc_home' ],
        pages: [ 'title_page', 'metadesc_page' ],
        posts: [ 'title_post', 'metadesc_post' ],
    };
    const currentTabKeys = tabKeys[ activeTab ] || [];
    const missingCount = isMultilingual ? languages.filter( ( l ) => {
        if ( l.code === defaultLang ) return false;
        return currentTabKeys.some( ( key ) => ! getLangValue( settings, key, l.code ) );
    } ).length : 0;

    const hasDefaultContent = currentTabKeys.some( ( key ) => getLangValue( settings, key, defaultLang ) );

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

            {/* Language switcher — for Homepage, Pages, Posts tabs */ }
            { isMultilingual && [ 'homepage', 'pages', 'posts' ].includes( activeTab ) && (
                <div className="flex items-center justify-between px-6 py-3 bg-white border border-gray-200 border-b-0 rounded-t-lg">
                    <div className="flex items-center gap-1">
                        { languages.map( ( lang ) => {
                            const titleKey = currentTabKeys[0];
                            const descKey = currentTabKeys[1];
                            const hasTitle = !! getLangValue( settings, titleKey, lang.code );
                            const hasDesc = !! getLangValue( settings, descKey, lang.code );
                            return (
                                <button
                                    key={ lang.code }
                                    onClick={ () => setActiveLang( lang.code ) }
                                    className={ `px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${ activeLang === lang.code
                                        ? lang.default ? 'bg-blue-600 text-white ring-2 ring-blue-300' : 'bg-blue-600 text-white'
                                        : lang.default ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }` }
                                >
                                    { lang.label }
                                    { lang.default && (
                                        <span className="ml-0.5 text-[10px]">({ __( 'default', 'snel-seo' ) })</span>
                                    ) }
                                    { ! lang.default && hasTitle && hasDesc && (
                                        <span className="ml-1 inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                                    ) }
                                    { ! lang.default && ( hasTitle || hasDesc ) && ! ( hasTitle && hasDesc ) && (
                                        <span className="ml-1 inline-block w-1.5 h-1.5 bg-amber-400 rounded-full" />
                                    ) }
                                </button>
                            );
                        } ) }
                    </div>
                    <Tooltip
                        text={ ! hasDefaultContent
                            ? `Fill in content in ${ languages.find( ( l ) => l.default )?.label || defaultLang.toUpperCase() } (default) first.`
                            : missingCount > 0
                                ? `Translate to all other languages using AI.`
                                : 'All languages have been translated.'
                        }
                        delay={ 100 }
                    >
                        <span className="inline-flex">
                            <button
                                type="button"
                                onClick={ handleTranslateAll }
                                disabled={ translatingAll || ! hasDefaultContent }
                                className="min-w-[140px] h-[28px] px-3 py-1 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-full overflow-hidden inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                { btnText ? (
                                    <span className={ `inline-block ${ btnText.includes( '...' ) ? 'animate-pulse' : '' }` } style={ btnAnimStyle }>
                                        { btnText }
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5">
                                        <Languages size={ 12 } />
                                        { missingCount > 0
                                            ? `${ __( 'Translate All', 'snel-seo' ) } (${ missingCount })`
                                            : __( 'Re-translate All', 'snel-seo' )
                                        }
                                    </span>
                                ) }
                            </button>
                        </span>
                    </Tooltip>
                </div>
            ) }

            {/* Tab content */ }
            <div className={ `bg-white border border-gray-200 p-6 ${ isMultilingual && [ 'homepage', 'pages', 'posts' ].includes( activeTab ) ? 'rounded-b-lg' : 'rounded-lg' }` }>
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
                            label={ __( 'SEO Title', 'snel-seo' ) + ( isMultilingual ? ` (${ activeLang.toUpperCase() })` : '' ) }
                            value={ getVal( 'title_home' ) }
                            onChange={ ( v ) => update( 'title_home', v ) }
                            badgeGroup="homepage"
                            defaultValue="%%sitename%% %%separator%% %%sitedesc%%"
                        />
                        <TemplateInput
                            label={ __( 'Meta Description', 'snel-seo' ) + ( isMultilingual ? ` (${ activeLang.toUpperCase() })` : '' ) }
                            value={ getVal( 'metadesc_home' ) }
                            onChange={ ( v ) => update( 'metadesc_home', v ) }
                            badgeGroup="homepage"
                            maxLength={ 160 }
                        />
                        <GooglePreview
                            title={ resolveTemplate( getVal( 'title_home' ) || '%%sitename%% %%separator%% %%sitedesc%%', previewVars ) }
                            url={ window.snelSeo?.siteUrl }
                            description={ getVal( 'metadesc_home' ) }
                        />
                    </div>
                ) }

                { activeTab === 'pages' && (
                    <div className="space-y-6">
                        <TemplateInput
                            label={ __( 'SEO Title Template', 'snel-seo' ) + ( isMultilingual ? ` (${ activeLang.toUpperCase() })` : '' ) }
                            value={ getVal( 'title_page' ) }
                            onChange={ ( v ) => update( 'title_page', v ) }
                            badgeGroup="page"
                            defaultValue="%%title%% %%separator%% %%sitename%%"
                        />
                        <TemplateInput
                            label={ __( 'Default Meta Description', 'snel-seo' ) + ( isMultilingual ? ` (${ activeLang.toUpperCase() })` : '' ) }
                            value={ getVal( 'metadesc_page' ) }
                            onChange={ ( v ) => update( 'metadesc_page', v ) }
                            badgeGroup="page"
                            maxLength={ 160 }
                        />
                        <GooglePreview
                            title={ resolveTemplate( getVal( 'title_page' ) || '%%title%% %%separator%% %%sitename%%', previewVars ) }
                            url={ window.snelSeo?.siteUrl + '/example-page/' }
                            description={ getVal( 'metadesc_page' ) }
                        />
                    </div>
                ) }

                { activeTab === 'posts' && (
                    <div className="space-y-6">
                        <TemplateInput
                            label={ __( 'SEO Title Template', 'snel-seo' ) + ( isMultilingual ? ` (${ activeLang.toUpperCase() })` : '' ) }
                            value={ getVal( 'title_post' ) }
                            onChange={ ( v ) => update( 'title_post', v ) }
                            badgeGroup="post"
                            defaultValue="%%title%% %%separator%% %%sitename%%"
                        />
                        <TemplateInput
                            label={ __( 'Default Meta Description', 'snel-seo' ) + ( isMultilingual ? ` (${ activeLang.toUpperCase() })` : '' ) }
                            value={ getVal( 'metadesc_post' ) }
                            onChange={ ( v ) => update( 'metadesc_post', v ) }
                            badgeGroup="post"
                            maxLength={ 160 }
                        />
                        <GooglePreview
                            title={ resolveTemplate( getVal( 'title_post' ) || '%%title%% %%separator%% %%sitename%%', previewVars ) }
                            url={ window.snelSeo?.siteUrl + '/example-post/' }
                            description={ getVal( 'metadesc_post' ) }
                        />
                    </div>
                ) }
            </div>
        </div>
    );
}
