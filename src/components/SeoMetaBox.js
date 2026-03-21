import { useState, useEffect } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { Search, Share2, Settings } from 'lucide-react';
import TemplateInput from './TemplateInput';
import GooglePreview from './GooglePreview';
import Tabs from './Tabs';

export default function SeoMetaBox() {
    const [ seoTitle, setSeoTitle ] = useState( '' );
    const [ metaDesc, setMetaDesc ] = useState( '' );
    const [ activeTab, setActiveTab ] = useState( 'seo' );

    // Get post info from the editor store
    const { postId, postTitle, permalink, isSaving } = useSelect( ( select ) => {
        const editor = select( 'core/editor' );
        return {
            postId: editor?.getCurrentPostId?.(),
            postTitle: editor?.getEditedPostAttribute?.( 'title' ) || '',
            permalink: editor?.getPermalink?.() || '',
            isSaving: editor?.isSavingPost?.() || false,
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
                setSeoTitle( data.seo_title || '' );
                setMetaDesc( data.metadesc || '' );
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
            // Post just finished saving — save our meta too
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
