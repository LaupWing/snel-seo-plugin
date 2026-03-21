import { useState, useEffect } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { Search, Share2, Settings, Sparkles } from 'lucide-react';
import TemplateInput from './TemplateInput';
import GooglePreview from './GooglePreview';
import Tabs from './Tabs';
import SocialPreview from './SocialPreview';

export default function SeoMetaBox() {
    // seoTitle and metaDesc are now objects: { nl: "...", en: "...", de: "..." }
    const [ seoTitle, setSeoTitle ] = useState( {} );
    const [ metaDesc, setMetaDesc ] = useState( {} );
    const [ activeTab, setActiveTab ] = useState( 'seo' );
    const [ activeLang, setActiveLang ] = useState( window.snelSeoEditor?.defaultLang || 'en' );
    const [ generatingTitle, setGeneratingTitle ] = useState( false );
    const [ generatingDesc, setGeneratingDesc ] = useState( false );

    const isMultilingual = window.snelSeoEditor?.multilingual || false;
    const languages = window.snelSeoEditor?.languages || [];
    const defaultLang = window.snelSeoEditor?.defaultLang || 'en';

    // Get post info from the editor store
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

    // Auto-save when WordPress saves the post
    const [ wasSaving, setWasSaving ] = useState( false );

    useEffect( () => {
        if ( isSaving && ! wasSaving ) {
            setWasSaving( true );
        }

        if ( ! isSaving && wasSaving ) {
            setWasSaving( false );
            if ( postId ) {
                fetch( `${ window.snelSeoEditor.restUrl }/${ postId }`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': window.snelSeoEditor.nonce,
                    },
                    body: JSON.stringify( {
                        seo_title: seoTitle,
                        metadesc: metaDesc,
                    } ),
                } );
            }
        }
    }, [ isSaving ] );

    // Update a language value in the object
    const updateTitle = ( value ) => {
        setSeoTitle( ( prev ) => ( { ...prev, [ activeLang ]: value } ) );
    };

    const updateDesc = ( value ) => {
        setMetaDesc( ( prev ) => ( { ...prev, [ activeLang ]: value } ) );
    };

    // AI generate
    const handleGenerate = async ( type ) => {
        if ( ! postId ) return;
        const setLoading = type === 'title' ? setGeneratingTitle : setGeneratingDesc;
        setLoading( true );

        try {
            const res = await fetch( `${ window.snelSeoEditor.generateUrl }/${ postId }`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': window.snelSeoEditor.nonce,
                },
                body: JSON.stringify( { type, lang: activeLang } ),
            } );
            const data = await res.json();
            if ( data.result ) {
                if ( type === 'title' ) {
                    updateTitle( data.result );
                } else {
                    updateDesc( data.result );
                }
            }
        } catch {
            // Silently fail
        }

        setLoading( false );
    };

    // Resolve the preview title for current language
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

    const tabs = [
        {
            id: 'seo',
            label: 'SEO',
            icon: Search,
            badge: statusBadge.label,
            badgeClass: statusBadge.className,
        },
        { id: 'social', label: 'Social', icon: Share2 },
        { id: 'advanced', label: 'Advanced', icon: Settings },
    ];

    return (
        <div className="p-4">
            <Tabs tabs={ tabs } active={ activeTab } onChange={ setActiveTab } />

            {/* SEO Tab */}
            { activeTab === 'seo' && (
                <div className="space-y-4">
                    {/* Language switcher */}
                    { isMultilingual && (
                        <div className="flex items-center gap-1 pb-3 border-b border-gray-100">
                            { languages.map( ( lang ) => (
                                <button
                                    key={ lang.code }
                                    onClick={ () => setActiveLang( lang.code ) }
                                    className={ `px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${ activeLang === lang.code
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }` }
                                >
                                    { lang.label }
                                    { ( seoTitle[ lang.code ] || metaDesc[ lang.code ] ) && (
                                        <span className="ml-1 inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                                    ) }
                                </button>
                            ) ) }
                        </div>
                    ) }

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
