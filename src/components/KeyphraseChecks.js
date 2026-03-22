import { useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { CheckCircle, XCircle, Loader2, ScanSearch } from 'lucide-react';

const CHECKS = [
    { id: 'title', label: 'Keyphrase in SEO title' },
    { id: 'description', label: 'Keyphrase in meta description' },
    { id: 'opening', label: 'Keyphrase in opening content' },
    { id: 'body', label: 'Keyphrase usage in content' },
    { id: 'url', label: 'Keyphrase in URL' },
    { id: 'overall', label: 'Overall SEO assessment' },
];

export default function KeyphraseChecks( { keyphrase, seoTitle, metaDesc, lang } ) {
    const [ results, setResults ] = useState( {} );
    const [ scanning, setScanning ] = useState( false );
    const [ activeCheck, setActiveCheck ] = useState( null );

    const { postId, permalink } = useSelect( ( select ) => {
        const editor = select( 'core/editor' );
        return {
            postId: editor?.getCurrentPostId?.(),
            permalink: editor?.getPermalink?.() || '',
        };
    }, [] );

    const handleScan = async () => {
        if ( ! postId || ! keyphrase || scanning ) return;
        setScanning( true );
        setResults( {} );

        // Fetch rendered content first
        let content = '';
        try {
            const renderRes = await fetch( `${ window.snelSeoEditor.renderUrl }/${ postId }?lang=${ lang }`, {
                headers: { 'X-WP-Nonce': window.snelSeoEditor.nonce },
            } );
            const renderData = await renderRes.json();
            content = renderData.full_text || '';
        } catch ( e ) {
            setScanning( false );
            return;
        }

        // Run each check one by one
        for ( const check of CHECKS ) {
            setActiveCheck( check.id );

            try {
                const res = await fetch( `${ window.snelSeoEditor.analyzeUrl }/${ postId }`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.snelSeoEditor.nonce },
                    body: JSON.stringify( {
                        check: check.id,
                        keyphrase,
                        seo_title: seoTitle,
                        meta_desc: metaDesc,
                        content,
                        url: permalink,
                        lang,
                    } ),
                } );
                const data = await res.json();
                setResults( ( prev ) => ( { ...prev, [ check.id ]: data } ) );
            } catch ( err ) {
                setResults( ( prev ) => ( {
                    ...prev,
                    [ check.id ]: { pass: false, message: 'Analysis failed', suggestion: '' },
                } ) );
            }

            // Small delay between checks for animation effect
            await new Promise( ( r ) => setTimeout( r, 200 ) );
        }

        setActiveCheck( null );
        setScanning( false );
    };

    if ( ! keyphrase ) return null;

    const completedChecks = Object.keys( results ).length;
    const passCount = Object.values( results ).filter( ( r ) => r.pass ).length;
    const hasResults = completedChecks > 0;

    return (
        <div className="mt-3">
            {/* Scan button */}
            <button
                type="button"
                onClick={ handleScan }
                disabled={ scanning }
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
                { scanning ? (
                    <>
                        <Loader2 size={ 14 } className="animate-spin" />
                        { __( 'Analyzing...', 'snel-seo' ) }
                    </>
                ) : (
                    <>
                        <ScanSearch size={ 14 } />
                        { hasResults ? __( 'Re-scan SEO', 'snel-seo' ) : __( 'Scan SEO', 'snel-seo' ) }
                    </>
                ) }
            </button>

            {/* Results */}
            { ( hasResults || scanning ) && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    { hasResults && ! scanning && (
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-gray-600">
                                { __( 'SEO Analysis', 'snel-seo' ) }
                            </span>
                            <span className={ `text-xs font-medium px-2 py-0.5 rounded-full ${
                                passCount === CHECKS.length ? 'bg-emerald-100 text-emerald-700'
                                    : passCount >= CHECKS.length / 2 ? 'bg-amber-100 text-amber-700'
                                        : 'bg-red-100 text-red-700'
                            }` }>
                                { passCount }/{ CHECKS.length }
                            </span>
                        </div>
                    ) }

                    <ul className="space-y-2.5">
                        { CHECKS.map( ( check ) => {
                            const result = results[ check.id ];
                            const isActive = activeCheck === check.id;
                            const isPending = scanning && ! result && ! isActive;

                            return (
                                <li
                                    key={ check.id }
                                    className={ `transition-all duration-300 ${ result ? 'opacity-100 translate-y-0' : isActive ? 'opacity-100' : isPending ? 'opacity-30' : 'opacity-0 h-0 overflow-hidden' }` }
                                >
                                    <div className="flex items-start gap-2 text-xs">
                                        { isActive && (
                                            <Loader2 size={ 14 } className="text-blue-500 mt-0.5 shrink-0 animate-spin" />
                                        ) }
                                        { result && result.pass && (
                                            <CheckCircle size={ 14 } className="text-emerald-500 mt-0.5 shrink-0" />
                                        ) }
                                        { result && ! result.pass && (
                                            <XCircle size={ 14 } className="text-red-400 mt-0.5 shrink-0" />
                                        ) }
                                        { isPending && (
                                            <div className="w-3.5 h-3.5 rounded-full bg-gray-200 mt-0.5 shrink-0" />
                                        ) }
                                        <div className="flex-1 min-w-0">
                                            { isActive && (
                                                <span className="text-blue-600 font-medium">
                                                    { __( 'Checking', 'snel-seo' ) }: { check.label }...
                                                </span>
                                            ) }
                                            { result && (
                                                <>
                                                    <span className={ `font-medium ${ result.pass ? 'text-gray-700' : 'text-gray-700' }` }>
                                                        { result.message }
                                                    </span>
                                                    { result.suggestion && (
                                                        <p className="mt-1 text-gray-500 leading-relaxed">
                                                            { result.suggestion }
                                                        </p>
                                                    ) }
                                                </>
                                            ) }
                                            { isPending && (
                                                <span className="text-gray-400">{ check.label }</span>
                                            ) }
                                        </div>
                                    </div>
                                </li>
                            );
                        } ) }
                    </ul>
                </div>
            ) }
        </div>
    );
}
