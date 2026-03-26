import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Globe, Home, FileText, PenTool, Save, Image, X, Languages, Boxes, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Tooltip } from '@wordpress/components';
import TemplateInput from '../components/TemplateInput';
import GooglePreview from '../components/GooglePreview';
import Tabs from '../components/Tabs';
import { SEPARATORS, getSeparatorChar, DEFAULT_TEMPLATES, MULTILINGUAL_KEYS, MAX_DESC_LENGTH } from '../config';

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
    { id: 'post_types', label: 'Post Types', icon: Boxes },
];

// MULTILINGUAL_KEYS imported from config.js

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
        const defaults = DEFAULT_TEMPLATES;
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
                            maxLength={ MAX_DESC_LENGTH }
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
                            maxLength={ MAX_DESC_LENGTH }
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
                            maxLength={ MAX_DESC_LENGTH }
                        />
                        <GooglePreview
                            title={ resolveTemplate( getVal( 'title_post' ) || '%%title%% %%separator%% %%sitename%%', previewVars ) }
                            url={ window.snelSeo?.siteUrl + '/example-post/' }
                            description={ getVal( 'metadesc_post' ) }
                        />
                    </div>
                ) }

                { activeTab === 'post_types' && (
                    <PostTypesTab
                        settings={ settings }
                        setSettings={ setSettings }
                        isMultilingual={ isMultilingual }
                        languages={ languages }
                        defaultLang={ defaultLang }
                        activeLang={ activeLang }
                        setActiveLang={ setActiveLang }
                        previewVars={ previewVars }
                    />
                ) }
            </div>
        </div>
    );
}

/**
 * Post Types tab — configure SEO templates and description fallback meta keys per custom post type.
 */
function PostTypesTab( { settings, setSettings, isMultilingual, languages, defaultLang, activeLang, setActiveLang, previewVars } ) {
    const postTypes = window.snelSeo?.postTypes || [];

    const [ activeCpt, setActiveCpt ] = useState( postTypes[0]?.name || '' );
    const currentCpt = postTypes.find( ( pt ) => pt.name === activeCpt );

    // Read/write post type settings from the main settings object.
    const cptSettings = settings.post_type_settings || {};
    const getCptConfig = ( cptName ) => cptSettings[ cptName ] || {};

    const updateCptConfig = ( cptName, key, value ) => {
        setSettings( ( prev ) => ( {
            ...prev,
            post_type_settings: {
                ...( prev.post_type_settings || {} ),
                [ cptName ]: {
                    ...( ( prev.post_type_settings || {} )[ cptName ] || {} ),
                    [ key ]: value,
                },
            },
        } ) );
    };

    const config = getCptConfig( activeCpt );
    const descFallbacks = config.desc_fallback_keys || [];

    const addFallbackKey = ( fieldKey ) => {
        if ( descFallbacks.includes( fieldKey ) ) return;
        updateCptConfig( activeCpt, 'desc_fallback_keys', [ ...descFallbacks, fieldKey ] );
    };

    const removeFallbackKey = ( fieldKey ) => {
        updateCptConfig( activeCpt, 'desc_fallback_keys', descFallbacks.filter( ( k ) => k !== fieldKey ) );
    };

    const moveFallbackKey = ( index, direction ) => {
        const newKeys = [ ...descFallbacks ];
        const swapIndex = index + direction;
        if ( swapIndex < 0 || swapIndex >= newKeys.length ) return;
        [ newKeys[ index ], newKeys[ swapIndex ] ] = [ newKeys[ swapIndex ], newKeys[ index ] ];
        updateCptConfig( activeCpt, 'desc_fallback_keys', newKeys );
    };

    // Build a lookup from field key to field object for the current CPT.
    const fields = currentCpt?.fields || [];
    const fieldMap = {};
    fields.forEach( ( f ) => { fieldMap[ f.key ] = f; } );

    // Fields not yet selected as fallbacks.
    const availableFields = fields.filter( ( f ) => ! descFallbacks.includes( f.key ) );

    // Find a field object by its key (may be a selected key not in current fields if data changed).
    const getField = ( key ) => fieldMap[ key ] || { key, label: key, type: 'plain' };

    // Type badge config.
    const typeBadge = ( type ) => {
        if ( type === 'multilingual' ) return { text: 'All languages', className: 'bg-purple-100 text-purple-700 border-purple-200' };
        if ( type === 'per_lang' ) return { text: 'Per language', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
        return { text: 'Single value', className: 'bg-gray-100 text-gray-600 border-gray-200' };
    };

    // Get multilingual values for CPT templates.
    const getCptVal = ( key ) => {
        const val = config[ key ];
        if ( ! val ) return '';
        if ( isMultilingual && typeof val === 'object' ) return val[ activeLang ] || '';
        if ( typeof val === 'object' ) return val[ defaultLang ] || '';
        return val || '';
    };

    const updateCptVal = ( key, value ) => {
        if ( isMultilingual ) {
            const current = config[ key ];
            const obj = ( typeof current === 'object' && current !== null ) ? { ...current } : {};
            obj[ activeLang ] = value;
            updateCptConfig( activeCpt, key, obj );
        } else {
            updateCptConfig( activeCpt, key, value );
        }
    };

    if ( ! postTypes.length ) {
        return (
            <div className="text-center py-12 text-gray-400">
                <Boxes size={ 40 } className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">{ __( 'No custom post types detected.', 'snel-seo' ) }</p>
            </div>
        );
    }

    return (
        <div className="flex gap-6">
            {/* Sidebar — post type list */ }
            <div className="w-48 shrink-0">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                    { __( 'Post Types', 'snel-seo' ) }
                </p>
                <div className="space-y-1">
                    { postTypes.map( ( pt ) => (
                        <button
                            key={ pt.name }
                            onClick={ () => setActiveCpt( pt.name ) }
                            className={ `w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${ activeCpt === pt.name
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
                            }` }
                        >
                            { pt.label }
                            <span className="block text-xs text-gray-400 mt-0.5">{ pt.name }</span>
                        </button>
                    ) ) }
                </div>
            </div>

            {/* Main content */ }
            <div className="flex-1 space-y-6">
                {/* Language switcher */ }
                { isMultilingual && (
                    <div className="flex items-center gap-1">
                        { languages.map( ( lang ) => (
                            <button
                                key={ lang.code }
                                onClick={ () => setActiveLang( lang.code ) }
                                className={ `px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${ activeLang === lang.code
                                    ? 'bg-blue-600 text-white'
                                    : lang.default ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }` }
                            >
                                { lang.label }
                                { lang.default && <span className="ml-0.5 text-[10px]">({ __( 'default', 'snel-seo' ) })</span> }
                            </button>
                        ) ) }
                    </div>
                ) }

                {/* Title template */ }
                <TemplateInput
                    label={ __( 'SEO Title Template', 'snel-seo' ) + ( isMultilingual ? ` (${ activeLang.toUpperCase() })` : '' ) }
                    value={ getCptVal( 'title_template' ) }
                    onChange={ ( v ) => updateCptVal( 'title_template', v ) }
                    badgeGroup="page"
                    defaultValue="%%title%% %%separator%% %%sitename%%"
                />

                {/* Meta description template */ }
                <TemplateInput
                    label={ __( 'Meta Description Template', 'snel-seo' ) + ( isMultilingual ? ` (${ activeLang.toUpperCase() })` : '' ) }
                    value={ getCptVal( 'metadesc_template' ) }
                    onChange={ ( v ) => updateCptVal( 'metadesc_template', v ) }
                    badgeGroup="page"
                    maxLength={ MAX_DESC_LENGTH }
                />

                {/* Google Preview */ }
                <GooglePreview
                    title={ resolveTemplate( getCptVal( 'title_template' ) || '%%title%% %%separator%% %%sitename%%', { ...previewVars, title: currentCpt?.label || '' } ) }
                    url={ window.snelSeo?.siteUrl + '/' + activeCpt + '/example/' }
                    description={ getCptVal( 'metadesc_template' ) }
                />

                {/* Description Fallback Fields */ }
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        { __( 'Description Fallback Fields', 'snel-seo' ) }
                    </label>
                    <p className="text-xs text-gray-400 mb-3">
                        { __( 'When no custom SEO description is set, these fields will be tried in order. The correct language is resolved automatically.', 'snel-seo' ) }
                    </p>

                    {/* Selected fallback fields (ordered) */ }
                    { descFallbacks.length > 0 ? (
                        <div className="space-y-1.5 mb-3">
                            { descFallbacks.map( ( key, index ) => {
                                const field = getField( key );
                                const badge = typeBadge( field.type );
                                return (
                                    <div
                                        key={ key }
                                        className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm"
                                    >
                                        <span className="text-blue-300 cursor-grab">
                                            <GripVertical size={ 14 } />
                                        </span>
                                        <span className="text-xs font-semibold text-blue-400 w-5">{ index + 1 }.</span>
                                        <span className="flex-1 flex items-center gap-2">
                                            <span className="font-medium text-blue-800">{ field.label }</span>
                                            <span className={ `px-1.5 py-0.5 text-[10px] font-medium rounded border ${ badge.className }` }>
                                                { badge.text }
                                            </span>
                                        </span>
                                        <div className="flex items-center gap-0.5">
                                            <button
                                                type="button"
                                                onClick={ () => moveFallbackKey( index, -1 ) }
                                                disabled={ index === 0 }
                                                className="p-1 text-blue-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                title={ __( 'Move up', 'snel-seo' ) }
                                            >
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L6 10M6 2L3 5M6 2L9 5" /></svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={ () => moveFallbackKey( index, 1 ) }
                                                disabled={ index === descFallbacks.length - 1 }
                                                className="p-1 text-blue-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                title={ __( 'Move down', 'snel-seo' ) }
                                            >
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 10L6 2M6 10L3 7M6 10L9 7" /></svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={ () => removeFallbackKey( key ) }
                                                className="p-1 text-blue-400 hover:text-red-500 transition-colors"
                                                title={ __( 'Remove', 'snel-seo' ) }
                                            >
                                                <Trash2 size={ 12 } />
                                            </button>
                                        </div>
                                    </div>
                                );
                            } ) }
                        </div>
                    ) : (
                        <div className="px-3 py-4 mb-3 border-2 border-dashed border-gray-300 rounded-lg text-center text-xs text-gray-500">
                            { __( 'No fallback fields selected. The plugin will use excerpt and post content as fallback.', 'snel-seo' ) }
                        </div>
                    ) }

                    {/* Available fields to add */ }
                    { availableFields.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-2">
                                { __( 'Available fields:', 'snel-seo' ) }
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                { availableFields.map( ( field ) => {
                                    const badge = typeBadge( field.type );
                                    return (
                                        <button
                                            key={ field.key }
                                            type="button"
                                            onClick={ () => addFallbackKey( field.key ) }
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-lg border border-gray-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
                                        >
                                            <Plus size={ 10 } />
                                            { field.label }
                                            <span className={ `px-1 py-0.5 text-[10px] rounded border ${ badge.className }` }>
                                                { badge.text }
                                            </span>
                                        </button>
                                    );
                                } ) }
                            </div>
                        </div>
                    ) }
                </div>
            </div>
        </div>
    );
}
