import { useState } from '@wordpress/element';
import {
    Panel,
    PanelBody,
    TextControl,
    TextareaControl,
    SelectControl,
    Button,
    Notice,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

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

export default function Settings() {
    const initial = window.snelSeo?.settings || {};
    const [ settings, setSettings ] = useState( initial );
    const [ saving, setSaving ] = useState( false );
    const [ notice, setNotice ] = useState( null );

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

            if ( res.ok ) {
                setNotice( { type: 'success', message: __( 'Settings saved.', 'snel-seo' ) } );
            } else {
                setNotice( { type: 'error', message: __( 'Failed to save settings.', 'snel-seo' ) } );
            }
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

    const homePreview = resolveTemplate(
        settings.title_home || '%%sitename%% %%separator%% %%sitedesc%%',
        previewVars
    );

    const pagePreview = resolveTemplate(
        settings.title_page || '%%title%% %%separator%% %%sitename%%',
        previewVars
    );

    return (
        <div>
            <h1>{ __( 'SEO Settings', 'snel-seo' ) }</h1>

            { notice && (
                <Notice
                    status={ notice.type }
                    isDismissible
                    onDismiss={ () => setNotice( null ) }
                >
                    { notice.message }
                </Notice>
            ) }

            <Panel>
                <PanelBody title={ __( 'Site Identity', 'snel-seo' ) } initialOpen>
                    <TextControl
                        label={ __( 'Website Name', 'snel-seo' ) }
                        help={ __( 'Used in title templates as %%sitename%%', 'snel-seo' ) }
                        value={ settings.website_name || '' }
                        onChange={ ( v ) => update( 'website_name', v ) }
                        __nextHasNoMarginBottom
                    />
                    <div style={ { marginTop: '16px' } }>
                        <SelectControl
                            label={ __( 'Title Separator', 'snel-seo' ) }
                            value={ settings.separator || 'sc-dash' }
                            options={ SEPARATORS }
                            onChange={ ( v ) => update( 'separator', v ) }
                            __nextHasNoMarginBottom
                        />
                    </div>
                </PanelBody>

                <PanelBody title={ __( 'Homepage', 'snel-seo' ) } initialOpen>
                    <TextControl
                        label={ __( 'SEO Title', 'snel-seo' ) }
                        help={ __( 'Template variables: %%sitename%%, %%sitedesc%%, %%separator%%', 'snel-seo' ) }
                        value={ settings.title_home || '' }
                        onChange={ ( v ) => update( 'title_home', v ) }
                        __nextHasNoMarginBottom
                    />
                    <p style={ { fontSize: '12px', color: '#666', marginTop: '4px' } }>
                        { __( 'Preview:', 'snel-seo' ) } <strong>{ homePreview }</strong>
                    </p>
                    <div style={ { marginTop: '16px' } }>
                        <TextareaControl
                            label={ __( 'Meta Description', 'snel-seo' ) }
                            value={ settings.metadesc_home || '' }
                            onChange={ ( v ) => update( 'metadesc_home', v ) }
                            rows={ 3 }
                            __nextHasNoMarginBottom
                        />
                        { settings.metadesc_home && (
                            <p style={ { fontSize: '12px', color: settings.metadesc_home.length > 160 ? '#d63638' : '#666' } }>
                                { settings.metadesc_home.length } / 160 { __( 'characters', 'snel-seo' ) }
                            </p>
                        ) }
                    </div>
                </PanelBody>

                <PanelBody title={ __( 'Pages', 'snel-seo' ) } initialOpen={ false }>
                    <TextControl
                        label={ __( 'SEO Title Template', 'snel-seo' ) }
                        help={ __( 'Variables: %%title%%, %%sitename%%, %%separator%%', 'snel-seo' ) }
                        value={ settings.title_page || '' }
                        onChange={ ( v ) => update( 'title_page', v ) }
                        __nextHasNoMarginBottom
                    />
                    <p style={ { fontSize: '12px', color: '#666', marginTop: '4px' } }>
                        { __( 'Preview:', 'snel-seo' ) } <strong>{ pagePreview }</strong>
                    </p>
                    <div style={ { marginTop: '16px' } }>
                        <TextareaControl
                            label={ __( 'Default Meta Description', 'snel-seo' ) }
                            help={ __( 'Used when a page has no custom meta description.', 'snel-seo' ) }
                            value={ settings.metadesc_page || '' }
                            onChange={ ( v ) => update( 'metadesc_page', v ) }
                            rows={ 3 }
                            __nextHasNoMarginBottom
                        />
                    </div>
                </PanelBody>

                <PanelBody title={ __( 'Posts', 'snel-seo' ) } initialOpen={ false }>
                    <TextControl
                        label={ __( 'SEO Title Template', 'snel-seo' ) }
                        help={ __( 'Variables: %%title%%, %%sitename%%, %%separator%%', 'snel-seo' ) }
                        value={ settings.title_post || '' }
                        onChange={ ( v ) => update( 'title_post', v ) }
                        __nextHasNoMarginBottom
                    />
                    <div style={ { marginTop: '16px' } }>
                        <TextareaControl
                            label={ __( 'Default Meta Description', 'snel-seo' ) }
                            value={ settings.metadesc_post || '' }
                            onChange={ ( v ) => update( 'metadesc_post', v ) }
                            rows={ 3 }
                            __nextHasNoMarginBottom
                        />
                    </div>
                </PanelBody>
            </Panel>

            <div style={ { marginTop: '16px' } }>
                <Button
                    variant="primary"
                    onClick={ handleSave }
                    isBusy={ saving }
                    disabled={ saving }
                >
                    { saving ? __( 'Saving...', 'snel-seo' ) : __( 'Save Settings', 'snel-seo' ) }
                </Button>
            </div>
        </div>
    );
}
