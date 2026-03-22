import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Download, Upload, FileCode, Save, RotateCcw, Loader2 } from 'lucide-react';

function RobotsEditor() {
    const [ content, setContent ] = useState( '' );
    const [ isCustom, setIsCustom ] = useState( false );
    const [ saving, setSaving ] = useState( false );
    const [ loading, setLoading ] = useState( true );
    const [ saved, setSaved ] = useState( false );

    useEffect( () => {
        fetch( `${ window.snelSeo.restUrl }/robots`, {
            headers: { 'X-WP-Nonce': window.snelSeo.nonce },
        } )
            .then( ( res ) => res.json() )
            .then( ( data ) => {
                setContent( data.content || '' );
                setIsCustom( data.is_custom || false );
                setLoading( false );
            } )
            .catch( () => setLoading( false ) );
    }, [] );

    const handleSave = async () => {
        setSaving( true );
        await fetch( `${ window.snelSeo.restUrl }/robots`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.snelSeo.nonce },
            body: JSON.stringify( { content } ),
        } );
        setIsCustom( true );
        setSaving( false );
        setSaved( true );
        setTimeout( () => setSaved( false ), 2000 );
    };

    const handleReset = async () => {
        setSaving( true );
        await fetch( `${ window.snelSeo.restUrl }/robots`, {
            method: 'DELETE',
            headers: { 'X-WP-Nonce': window.snelSeo.nonce },
        } );
        // Reload default
        const res = await fetch( `${ window.snelSeo.restUrl }/robots`, {
            headers: { 'X-WP-Nonce': window.snelSeo.nonce },
        } );
        const data = await res.json();
        setContent( data.content || '' );
        setIsCustom( false );
        setSaving( false );
    };

    if ( loading ) {
        return (
            <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
                <Loader2 size={ 14 } className="animate-spin" />
                { __( 'Loading...', 'snel-seo' ) }
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">
                    { __( 'Edit your robots.txt file. This controls which pages search engines can crawl.', 'snel-seo' ) }
                </p>
                { isCustom && (
                    <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        { __( 'custom', 'snel-seo' ) }
                    </span>
                ) }
            </div>
            <textarea
                value={ content }
                onChange={ ( e ) => setContent( e.target.value ) }
                rows={ 10 }
                className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_1px_#3b82f6] resize-y"
            />
            <div className="flex items-center gap-2 mt-3">
                <button
                    type="button"
                    onClick={ handleSave }
                    disabled={ saving }
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                    { saving ? <Loader2 size={ 14 } className="animate-spin" /> : <Save size={ 14 } /> }
                    { saved ? __( 'Saved!', 'snel-seo' ) : __( 'Save', 'snel-seo' ) }
                </button>
                { isCustom && (
                    <button
                        type="button"
                        onClick={ handleReset }
                        disabled={ saving }
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <RotateCcw size={ 14 } />
                        { __( 'Reset to default', 'snel-seo' ) }
                    </button>
                ) }
            </div>
        </div>
    );
}

export default function Tools() {
    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">
                    { __( 'Tools', 'snel-seo' ) }
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    { __( 'Import, export, and manage your SEO configuration.', 'snel-seo' ) }
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <Download size={ 16 } className="text-blue-600" />
                        </div>
                        <h2 className="text-sm font-semibold text-gray-900">
                            { __( 'Export Settings', 'snel-seo' ) }
                        </h2>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                        { __( 'Download your Snel SEO settings as a JSON file. Use this to copy settings to another site.', 'snel-seo' ) }
                    </p>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                        <Download size={ 14 } />
                        { __( 'Export JSON', 'snel-seo' ) }
                    </button>
                </div>

                {/* Import */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                            <Upload size={ 16 } className="text-emerald-600" />
                        </div>
                        <h2 className="text-sm font-semibold text-gray-900">
                            { __( 'Import Settings', 'snel-seo' ) }
                        </h2>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                        { __( 'Upload a Snel SEO JSON file to restore settings from another site.', 'snel-seo' ) }
                    </p>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                        <Upload size={ 14 } />
                        { __( 'Import JSON', 'snel-seo' ) }
                    </button>
                </div>

                {/* Robots.txt */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 md:col-span-2">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                            <FileCode size={ 16 } className="text-amber-600" />
                        </div>
                        <h2 className="text-sm font-semibold text-gray-900">
                            { __( 'Robots.txt', 'snel-seo' ) }
                        </h2>
                    </div>
                    <RobotsEditor />
                </div>
            </div>
        </div>
    );
}
