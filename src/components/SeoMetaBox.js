import { useState, useEffect } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { Search, Share2, Settings, Sparkles, Languages, Check, Loader2 } from 'lucide-react';
import { Tooltip } from '@wordpress/components';
import TemplateInput from './TemplateInput';
import GooglePreview from './GooglePreview';
import Tabs from './Tabs';
import SocialPreview from './SocialPreview';

export default function SeoMetaBox() {
    const [ seoTitle, setSeoTitle ] = useState( {} );
    const [ metaDesc, setMetaDesc ] = useState( {} );
    const [ activeTab, setActiveTab ] = useState( 'seo' );
    const [ activeLang, setActiveLang ] = useState( window.snelSeoEditor?.defaultLang || 'en' );
    const [ generatingTitle, setGeneratingTitle ] = useState( false );
    const [ generatingDesc, setGeneratingDesc ] = useState( false );
    const [ translatingAll, setTranslatingAll ] = useState( false );
    // { langCode: 'translating' | 'done' | 'skipped' }
    const [ translationProgress, setTranslationProgress ] = useState( {} );

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
                    body: JSON.stringify( { seo_title: seoTitle, metadesc: metaDesc } ),
                } );
            }
        }
    }, [ isSaving ] );

    const updateTitle = ( value ) => setSeoTitle( ( prev ) => ( { ...prev, [ activeLang ]: value } ) );
    const updateDesc = ( value ) => setMetaDesc( ( prev ) => ( { ...prev, [ activeLang ]: value } ) );

    // AI generate for single language
    const handleGenerate = async ( type ) => {
        if ( ! postId ) return;
        const setLoading = type === 'title' ? setGeneratingTitle : setGeneratingDesc;
        setLoading( true );
        try {
            const res = await fetch( `${ window.snelSeoEditor.generateUrl }/${ postId }`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.snelSeoEditor.nonce },
                body: JSON.stringify( { type, lang: activeLang } ),
            } );
            const data = await res.json();
            if ( data.result ) {
                if ( type === 'title' ) updateTitle( data.result );
                else updateDesc( data.result );
            }
        } catch {}
        setLoading( false );
    };

    // Translate All — generate title + description for all non-default languages
    const handleTranslateAll = async () => {
        if ( ! postId ) return;
        setTranslatingAll( true );
        setTranslationProgress( {} );

        const otherLangs = languages.filter( ( l ) => l.code !== defaultLang );

        for ( const lang of otherLangs ) {
            const needsTitle = seoTitle[ defaultLang ] && ! seoTitle[ lang.code ];
            const needsDesc = metaDesc[ defaultLang ] && ! metaDesc[ lang.code ];

            if ( ! needsTitle && ! needsDesc ) {
                setTranslationProgress( ( prev ) => ( { ...prev, [ lang.code ]: 'skipped' } ) );
                continue;
            }

            setTranslationProgress( ( prev ) => ( { ...prev, [ lang.code ]: 'translating' } ) );

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
                    }
                } catch {}
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
                    }
                } catch {}
            }

            setTranslationProgress( ( prev ) => ( { ...prev, [ lang.code ]: 'done' } ) );
        }

        // Keep progress visible for a moment so user sees the checkmarks.
        setTimeout( () => {
            setTranslatingAll( false );
            setTranslationProgress( {} );
        }, 2000 );
    };

    // Count how many languages are missing content
    const missingCount = languages.filter( ( l ) =>
        l.code !== defaultLang && ( ! seoTitle[ l.code ] || ! metaDesc[ l.code ] )
    ).length;

    // Resolve preview
    const settings = window.snelSeoEditor?.settings || {};
    const sepChar = {
        'sc-dash': '–', 'sc-hyphen': '-', 'sc-pipe': '|',
        'sc-middot': '·', 'sc-bullet': '•', 'sc-raquo': '»', 'sc-slash': '/',
    }[ settings.separator ] || '–';

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
    const hasDefaultContent = seoTitle[ defaultLang ] || metaDesc[ defaultLang ];
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
                                    disabled={ translatingAll || missingCount === 0 || ! hasDefaultContent }
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-full hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Languages size={ 12 } className={ translatingAll ? 'animate-spin' : '' } />
                                    { translatingAll
                                        ? __( 'Translating...', 'snel-seo' )
                                        : missingCount > 0
                                            ? `${ __( 'Translate All', 'snel-seo' ) } (${ missingCount })`
                                            : __( 'All translated', 'snel-seo' )
                                    }
                                </button>
                            </span>
                        </Tooltip>
                    </div>

                    { translatingAll && Object.keys( translationProgress ).length > 0 && (
                        <div className="flex flex-wrap gap-2 py-2">
                            { languages.filter( ( l ) => l.code !== defaultLang ).map( ( lang ) => {
                                const status = translationProgress[ lang.code ];
                                return (
                                    <div
                                        key={ lang.code }
                                        className={ `flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all duration-300 ${
                                            status === 'done' ? 'bg-emerald-50 text-emerald-600'
                                            : status === 'translating' ? 'bg-blue-50 text-blue-600'
                                            : status === 'skipped' ? 'bg-gray-50 text-gray-400'
                                            : 'bg-gray-50 text-gray-300'
                                        }` }
                                    >
                                        { status === 'done' && <Check size={ 10 } /> }
                                        { status === 'translating' && <Loader2 size={ 10 } className="animate-spin" /> }
                                        { lang.label }
                                    </div>
                                );
                            } ) }
                        </div>
                    ) }
                </>
            ) }

            <Tabs tabs={ tabs } active={ activeTab } onChange={ setActiveTab } />

            {/* SEO Tab */}
            { activeTab === 'seo' && (
                <div className="space-y-4">
                    <div>
                        <TemplateInput
                            label={ __( 'SEO Title', 'snel-seo' ) + ( isMultilingual ? ` (${ activeLang.toUpperCase() })` : '' ) }
                            value={ currentTitle }
                            onChange={ updateTitle }
                            badgeGroup="page"
                        />
                        <button
                            type="button"
                            onClick={ () => handleGenerate( 'title' ) }
                            disabled={ generatingTitle }
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-full hover:bg-purple-100 transition-colors disabled:opacity-50"
                        >
                            <Sparkles size={ 12 } className={ generatingTitle ? 'animate-spin' : '' } />
                            { generatingTitle ? __( 'Generating...', 'snel-seo' ) : __( 'Generate with AI', 'snel-seo' ) }
                        </button>
                    </div>

                    <div>
                        <TemplateInput
                            label={ __( 'Meta Description', 'snel-seo' ) + ( isMultilingual ? ` (${ activeLang.toUpperCase() })` : '' ) }
                            value={ currentDesc }
                            onChange={ updateDesc }
                            badgeGroup="page"
                            maxLength={ 160 }
                        />
                        <button
                            type="button"
                            onClick={ () => handleGenerate( 'description' ) }
                            disabled={ generatingDesc }
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-full hover:bg-purple-100 transition-colors disabled:opacity-50"
                        >
                            <Sparkles size={ 12 } className={ generatingDesc ? 'animate-spin' : '' } />
                            { generatingDesc ? __( 'Generating...', 'snel-seo' ) : __( 'Generate with AI', 'snel-seo' ) }
                        </button>
                    </div>

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
