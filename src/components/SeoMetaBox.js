import { useState, useEffect } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { Save, Search, Share2, Settings } from 'lucide-react';
import TemplateInput from './TemplateInput';
import GooglePreview from './GooglePreview';
import Tabs from './Tabs';

export default function SeoMetaBox( { postId } ) {
    const [ seoTitle, setSeoTitle ] = useState( '' );
    const [ metaDesc, setMetaDesc ] = useState( '' );
    const [ saving, setSaving ] = useState( false );
    const [ notice, setNotice ] = useState( null );
    const [ activeTab, setActiveTab ] = useState( 'seo' );

    // Get post title and permalink from the editor store
    const { postTitle, permalink } = useSelect( ( select ) => {
        const editor = select( 'core/editor' );
        return {
            postTitle: editor?.getEditedPostAttribute?.( 'title' ) || '',
            permalink: editor?.getPermalink?.() || '',
        };
    }, [] );

    // Load existing meta values
    useEffect( () => {
        if ( ! postId ) return;

        wp.apiFetch( { path: `/wp/v2/pages/${ postId }?context=edit` } )
            .then( ( post ) => {
                const meta = post.meta || {};
                setSeoTitle( meta._yoast_wpseo_title || '' );
                setMetaDesc( meta._yoast_wpseo_metadesc || '' );
            } )
            .catch( () => {
                wp.apiFetch( { path: `/wp/v2/posts/${ postId }?context=edit` } )
                    .then( ( post ) => {
                        const meta = post.meta || {};
                        setSeoTitle( meta._yoast_wpseo_title || '' );
                        setMetaDesc( meta._yoast_wpseo_metadesc || '' );
                    } )
                    .catch( () => {} );
            } );
    }, [ postId ] );

    const handleSave = async () => {
        setSaving( true );
        setNotice( null );

        try {
            const res = await fetch( `${ window.snelSeoEditor.restUrl }/${ postId }`, {
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

            if ( res.ok ) {
                setNotice( { type: 'success', message: __( 'SEO data saved.', 'snel-seo' ) } );
                setTimeout( () => setNotice( null ), 3000 );
            } else {
                setNotice( { type: 'error', message: __( 'Failed to save.', 'snel-seo' ) } );
            }
        } catch {
            setNotice( { type: 'error', message: __( 'Network error.', 'snel-seo' ) } );
        }

        setSaving( false );
    };

    // Resolve the preview title
    const settings = window.snelSeoEditor?.settings || {};
    const sepChar = {
        'sc-dash': '–', 'sc-hyphen': '-', 'sc-pipe': '|',
        'sc-middot': '·', 'sc-bullet': '•', 'sc-raquo': '»', 'sc-slash': '/',
    }[ settings.separator ] || '–';

    const siteName = settings.website_name || '';
    const previewTitle = seoTitle
        ? seoTitle
            .replace( /%%title%%/g, postTitle )
            .replace( /%%sitename%%/g, siteName )
            .replace( /%%separator%%/g, sepChar )
        : `${ postTitle } ${ sepChar } ${ siteName }`;

    const isConfigured = seoTitle || metaDesc;
    const statusBadge = isConfigured
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
            { notice && (
                <div className={ `mb-4 px-3 py-2 rounded-lg text-xs ${ notice.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200' }` }>
                    { notice.message }
                </div>
            ) }

            <Tabs tabs={ tabs } active={ activeTab } onChange={ setActiveTab } />

            {/* SEO Tab */}
            { activeTab === 'seo' && (
                <div className="space-y-4">
                    <TemplateInput
                        label={ __( 'SEO Title', 'snel-seo' ) }
                        value={ seoTitle }
                        onChange={ setSeoTitle }
                        badgeGroup="page"
                    />

                    <TemplateInput
                        label={ __( 'Meta Description', 'snel-seo' ) }
                        value={ metaDesc }
                        onChange={ setMetaDesc }
                        badgeGroup="page"
                        maxLength={ 160 }
                    />

                    <GooglePreview
                        title={ previewTitle }
                        url={ permalink }
                        description={ metaDesc }
                    />

                    <div className="mt-4">
                        <button
                            onClick={ handleSave }
                            disabled={ saving }
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            <Save size={ 14 } />
                            { saving ? __( 'Saving...', 'snel-seo' ) : __( 'Save SEO', 'snel-seo' ) }
                        </button>
                    </div>
                </div>
            ) }

            {/* Social Tab */}
            { activeTab === 'social' && (
                <div className="py-6 text-center">
                    <Share2 size={ 24 } className="text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                        { __( 'Social preview & Open Graph overrides coming soon.', 'snel-seo' ) }
                    </p>
                </div>
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
