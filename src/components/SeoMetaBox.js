import { useState, useEffect } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { Search, Share2, Settings, Sparkles, Languages, Target } from 'lucide-react';
import { Tooltip } from '@wordpress/components';
import { getSeparatorChar } from '../config';
import TemplateInput from './TemplateInput';
import GooglePreview from './GooglePreview';
import Tabs from './Tabs';
import SocialPreview from './SocialPreview';
import KeyphraseChecks from './KeyphraseChecks';

export default function SeoMetaBox() {
    const { createSuccessNotice, createErrorNotice } = useDispatch( 'core/notices' );
    const [ focusKw, setFocusKw ] = useState( {} );
    const [ seoTitle, setSeoTitle ] = useState( {} );
    const [ metaDesc, setMetaDesc ] = useState( {} );
    const [ activeTab, setActiveTab ] = useState( 'seo' );
    const [ activeLang, setActiveLang ] = useState( window.snelSeoEditor?.defaultLang || 'en' );
    const [ generatingTitle, setGeneratingTitle ] = useState( false );
    const [ generatingDesc, setGeneratingDesc ] = useState( false );
    const [ translatingAll, setTranslatingAll ] = useState( false );
    const [ btnText, setBtnText ] = useState( null );
    const [ btnAnimStyle, setBtnAnimStyle ] = useState( {} );

    const isMultilingual = window.snelSeoEditor?.multilingual || false;
    const languages = window.snelSeoEditor?.languages || [];
    const defaultLang = window.snelSeoEditor?.defaultLang || 'en';

    const { postId, postTitle, permalink, isSaving, featuredImageUrl } = useSelect( ( select ) => {
        const editor = select( 'core/editor' );
        const featuredImageId = editor?.getEditedPostAttribute?.( 'featured_media' );
        const media = featuredImageId ? select( 'core' )?.getMedia?.( featuredImageId ) : null;
        return {
            postId: editor?.getCurrentPostId?.(),
            postTitle: editor?.getEditedPostAttribute?.( 'title' ) || '',
            permalink: editor?.getPermalink?.() || '',
            isSaving: editor?.isSavingPost?.() || false,
            featuredImageUrl: media?.source_url || '',
        };
    }, [] );

    // Load existing meta values
    useEffect( () => {
        if ( ! postId ) return;
        fetch( `${ window.snelSeoEditor.restUrl }/${ postId }`, {
            headers: { 'X-WP-Nonce': window.snelSeoEditor.nonce },
        } )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setFocusKw( data.focus_kw || {} );
                setSeoTitle( data.seo_title || {} );
                setMetaDesc( data.metadesc || {} );
            } )
            .catch( () => {} );
    }, [ postId ] );

    // Auto-save when WordPress saves
    const [ wasSaving, setWasSaving ] = useState( false );
    useEffect( () => {
        if ( isSaving && ! wasSaving ) setWasSaving( true );
        if ( ! isSaving && wasSaving ) {
            setWasSaving( false );
            if ( postId ) {
                fetch( `${ window.snelSeoEditor.restUrl }/${ postId }`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.snelSeoEditor.nonce },
                    body: JSON.stringify( { seo_title: seoTitle, metadesc: metaDesc, focus_kw: focusKw } ),
                } );
            }
        }
    }, [ isSaving ] );

    const updateFocusKw = ( value ) => setFocusKw( ( prev ) => ( { ...prev, [ activeLang ]: value } ) );
    const updateTitle = ( value ) => setSeoTitle( ( prev ) => ( { ...prev, [ activeLang ]: value } ) );
    const updateDesc = ( value ) => setMetaDesc( ( prev ) => ( { ...prev, [ activeLang ]: value } ) );

    // AI generate for single language
    const handleGenerate = async ( type ) => {
        if ( ! postId ) return;

        const setLoading = type === 'title' ? setGeneratingTitle : setGeneratingDesc;
        setLoading( true );
        try {
            // Fetch rendered content from server (language-aware)
            const renderRes = await fetch( `${ window.snelSeoEditor.renderUrl }/${ postId }?lang=${ activeLang }`, {
                headers: { 'X-WP-Nonce': window.snelSeoEditor.nonce },
            } );
            const renderData = await renderRes.json();
            const content = renderData.full_text || '';

            const res = await fetch( `${ window.snelSeoEditor.generateUrl }/${ postId }`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.snelSeoEditor.nonce },
                body: JSON.stringify( { type, lang: activeLang, content } ),
            } );
            const data = await res.json();
            if ( data.result ) {
                if ( type === 'title' ) updateTitle( data.result );
                else updateDesc( data.result );
                const label = type === 'title' ? __( 'SEO title', 'snel-seo' ) : __( 'Meta description', 'snel-seo' );
                createSuccessNotice( `${ label } ${ __( 'generated successfully', 'snel-seo' ) }`, { type: 'snackbar' } );
            } else {
                const msg = data.message || data.data?.message || __( 'Generation failed.', 'snel-seo' );
                createErrorNotice( `Snel SEO: ${ msg }`, { type: 'snackbar' } );
            }
        } catch ( err ) {
            createErrorNotice( `Snel SEO: ${ err.message || __( 'Could not reach the server.', 'snel-seo' ) }`, { type: 'snackbar' } );
        }
        setLoading( false );
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

    // Translate All — generate title + description for target languages
    const handleTranslateAll = async () => {
        if ( ! postId ) return;
        setTranslatingAll( true );

        const otherLangs = activeLang === defaultLang
            ? languages.filter( ( l ) => l.code !== defaultLang )
            : [ { code: activeLang, label: activeLang.toUpperCase() } ];

        for ( const lang of otherLangs ) {
            const hasTitle = !! seoTitle[ defaultLang ] || !! seoTitle[ lang.code ];
            const needsTitle = hasTitle || !! postTitle;
            const needsDesc = !! metaDesc[ defaultLang ] || !! metaDesc[ lang.code ] || !! postTitle;
            const needsKw = !! focusKw[ defaultLang ];

            await animateBtnText( `✦ Translating ${ lang.label }...` );

            if ( needsTitle ) {
                try {
                    const res = await fetch( `${ window.snelSeoEditor.generateUrl }/${ postId }`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.snelSeoEditor.nonce },
                        body: JSON.stringify( { type: 'title', lang: lang.code } ),
                    } );
                    const data = await res.json();
                    if ( data.result ) {
                        setSeoTitle( ( prev ) => ( { ...prev, [ lang.code ]: data.result } ) );
                    } else {
                        const msg = data.message || data.data?.message || 'Title generation failed.';
                        createErrorNotice( `Snel SEO (${ lang.label }): ${ msg }`, { type: 'snackbar' } );
                        break;
                    }
                } catch ( err ) {
                    createErrorNotice( `Snel SEO (${ lang.label }): ${ err.message || 'Could not reach the server.' }`, { type: 'snackbar' } );
                    break;
                }
            }

            if ( needsDesc ) {
                try {
                    const res = await fetch( `${ window.snelSeoEditor.generateUrl }/${ postId }`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.snelSeoEditor.nonce },
                        body: JSON.stringify( { type: 'description', lang: lang.code } ),
                    } );
                    const data = await res.json();
                    if ( data.result ) {
                        setMetaDesc( ( prev ) => ( { ...prev, [ lang.code ]: data.result } ) );
                    } else {
                        const msg = data.message || data.data?.message || 'Description generation failed.';
                        createErrorNotice( `Snel SEO (${ lang.label }): ${ msg }`, { type: 'snackbar' } );
                        break;
                    }
                } catch ( err ) {
                    createErrorNotice( `Snel SEO (${ lang.label }): ${ err.message || 'Could not reach the server.' }`, { type: 'snackbar' } );
                    break;
                }
            }

            if ( needsKw ) {
                try {
                    const res = await fetch( `${ window.snelSeoEditor.generateUrl }/${ postId }`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.snelSeoEditor.nonce },
                        body: JSON.stringify( { type: 'keyphrase', lang: lang.code, source_keyphrase: focusKw[ defaultLang ] } ),
                    } );
                    const data = await res.json();
                    if ( data.result ) {
                        setFocusKw( ( prev ) => ( { ...prev, [ lang.code ]: data.result } ) );
                    } else {
                        const msg = data.message || data.data?.message || 'Keyphrase translation failed.';
                        createErrorNotice( `Snel SEO (${ lang.label }): ${ msg }`, { type: 'snackbar' } );
                        break;
                    }
                } catch ( err ) {
                    createErrorNotice( `Snel SEO (${ lang.label }): ${ err.message || 'Could not reach the server.' }`, { type: 'snackbar' } );
                    break;
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


    // Count how many languages are missing content
    const missingCount = languages.filter( ( l ) =>
        l.code !== defaultLang && ( ! seoTitle[ l.code ] || ! metaDesc[ l.code ] || ( focusKw[ defaultLang ] && ! focusKw[ l.code ] ) )
    ).length;

    // Resolve preview
    const settings = window.snelSeoEditor?.settings || {};
    const sepChar = getSeparatorChar( settings.separator );

    const siteName = settings.website_name || '';
    const currentTitle = seoTitle[ activeLang ] || '';
    const currentDesc = metaDesc[ activeLang ] || '';

    const previewTitle = currentTitle
        ? currentTitle
            .replace( /%%title%%/g, postTitle )
            .replace( /%%sitename%%/g, siteName )
            .replace( /%%separator%%/g, sepChar )
        : `${ postTitle } ${ sepChar } ${ siteName }`;

    const hasAnyContent = Object.values( seoTitle ).some( ( v ) => v ) || Object.values( metaDesc ).some( ( v ) => v );
    const statusBadge = hasAnyContent
        ? { label: __( 'Configured', 'snel-seo' ), className: 'bg-emerald-100 text-emerald-600' }
        : { label: __( 'Not set', 'snel-seo' ), className: 'bg-amber-100 text-amber-600' };

    const defaultLangLabel = languages.find( ( l ) => l.default )?.label || defaultLang.toUpperCase();
    const hasDefaultContent = seoTitle[ defaultLang ] || metaDesc[ defaultLang ] || postTitle;
    const hasAnyTranslations = languages.some( ( l ) => l.code !== defaultLang && ( seoTitle[ l.code ] || metaDesc[ l.code ] ) );
    const translateTooltip = ! hasDefaultContent
        ? `Fill in SEO title and meta description in ${ defaultLangLabel } (default language) first to enable translation.`
        : missingCount > 0
            ? `Translate SEO title and description from ${ defaultLangLabel } to all other languages using AI.`
            : 'All languages have been translated.';

    const tabs = [
        { id: 'seo', label: 'SEO', icon: Search, badge: statusBadge.label, badgeClass: statusBadge.className },
        { id: 'social', label: 'Social', icon: Share2 },
        { id: 'advanced', label: 'Advanced', icon: Settings },
    ];

    return (
        <div className="p-4">
            {/* Language switcher — above tabs */}
            { isMultilingual && (
                <>
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                        <div className="flex items-center gap-1">
                            { languages.map( ( lang ) => (
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
                                    { ! lang.default && ( seoTitle[ lang.code ] && metaDesc[ lang.code ] ) && (
                                        <span className="ml-1 inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                                    ) }
                                    { ! lang.default && ( ! seoTitle[ lang.code ] || ! metaDesc[ lang.code ] ) && ( seoTitle[ lang.code ] || metaDesc[ lang.code ] ) && (
                                        <span className="ml-1 inline-block w-1.5 h-1.5 bg-amber-400 rounded-full" />
                                    ) }
                                </button>
                            ) ) }
                        </div>
                        <Tooltip text={ translateTooltip } delay={ 100 }>
                            <span className="inline-flex">
                                <button
                                    type="button"
                                    onClick={ handleTranslateAll }
                                    disabled={ translatingAll || ( ! hasDefaultContent && ! hasAnyTranslations ) }
                                    className="min-w-[140px] h-[28px] px-3 py-1 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-full overflow-hidden inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    { btnText ? (
                                        <span className={ `inline-block ${ btnText.includes( '...' ) ? 'animate-pulse' : '' }` } style={ btnAnimStyle }>
                                            { btnText }
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Languages size={ 12 } />
                                            { activeLang === defaultLang
                                                ? ( missingCount > 0
                                                    ? `${ __( 'Translate All', 'snel-seo' ) } (${ missingCount })`
                                                    : __( 'Re-translate All', 'snel-seo' ) )
                                                : `${ __( 'Translate All for', 'snel-seo' ) } ${ activeLang.toUpperCase() }`
                                            }
                                        </span>
                                    ) }
                                </button>
                            </span>
                        </Tooltip>
                    </div>
                </>
            ) }

            <Tabs tabs={ tabs } active={ activeTab } onChange={ setActiveTab } />

            {/* SEO Tab */}
            { activeTab === 'seo' && (
                <div className="space-y-6">
                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                            <Target size={ 14 } className="text-gray-400" />
                            { __( 'Focus Keyphrase', 'snel-seo' ) + ( isMultilingual ? ` (${ activeLang.toUpperCase() })` : '' ) }
                        </label>
                        <input
                            type="text"
                            value={ focusKw[ activeLang ] || '' }
                            onChange={ ( e ) => updateFocusKw( e.target.value ) }
                            placeholder={ __( 'e.g. antique oak bookcase', 'snel-seo' ) }
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_1px_#3b82f6]"
                        />
                        <KeyphraseChecks
                            keyphrase={ focusKw[ activeLang ] || '' }
                            seoTitle={ currentTitle }
                            metaDesc={ currentDesc }
                            onSelectKeyphrase={ updateFocusKw }
                            lang={ activeLang }
                        />
                    </div>

                    <TemplateInput
                        label={ __( 'SEO Title', 'snel-seo' ) + ( isMultilingual ? ` (${ activeLang.toUpperCase() })` : '' ) }
                        value={ currentTitle }
                        onChange={ updateTitle }
                        badgeGroup="page"
                        placeholder={ `${ postTitle } ${ sepChar } ${ siteName }` }
                        action={
                            <Tooltip text={ generatingTitle ? __( 'Generating...', 'snel-seo' ) : __( 'Generate with AI', 'snel-seo' ) } delay={ 100 }>
                                <button
                                    type="button"
                                    onClick={ () => handleGenerate( 'title' ) }
                                    disabled={ generatingTitle }
                                    className="p-1 rounded hover:bg-purple-50 transition-colors disabled:opacity-50"
                                >
                                    <Sparkles size={ 14 } className={ `text-purple-400 hover:text-purple-600 ${ generatingTitle ? 'animate-spin' : '' }` } />
                                </button>
                            </Tooltip>
                        }
                    />

                    <TemplateInput
                        label={ __( 'Meta Description', 'snel-seo' ) + ( isMultilingual ? ` (${ activeLang.toUpperCase() })` : '' ) }
                        value={ currentDesc }
                        onChange={ updateDesc }
                        badgeGroup="page"
                        maxLength={ 160 }
                        placeholder={ __( 'Click ✦ to generate from page content, or type manually...', 'snel-seo' ) }
                        action={
                            <Tooltip text={ generatingDesc ? __( 'Generating...', 'snel-seo' ) : __( 'Generate with AI', 'snel-seo' ) } delay={ 100 }>
                                <button
                                    type="button"
                                    onClick={ () => handleGenerate( 'description' ) }
                                    disabled={ generatingDesc }
                                    className="p-1 rounded hover:bg-purple-50 transition-colors disabled:opacity-50"
                                >
                                    <Sparkles size={ 14 } className={ `text-purple-400 hover:text-purple-600 ${ generatingDesc ? 'animate-spin' : '' }` } />
                                </button>
                            </Tooltip>
                        }
                    />

                    <GooglePreview
                        title={ previewTitle }
                        url={ permalink }
                        description={ currentDesc }
                    />
                </div>
            ) }

            {/* Social Tab */}
            { activeTab === 'social' && (
                <SocialPreview
                    title={ previewTitle }
                    description={ currentDesc }
                    url={ permalink }
                    imageUrl={ featuredImageUrl || window.snelSeoEditor?.settings?.default_og_image }
                />
            ) }

            {/* Advanced Tab */}
            { activeTab === 'advanced' && (
                <div className="py-6 text-center">
                    <Settings size={ 24 } className="text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                        { __( 'Canonical URL, robots directives, and more coming soon.', 'snel-seo' ) }
                    </p>
                </div>
            ) }
        </div>
    );
}
