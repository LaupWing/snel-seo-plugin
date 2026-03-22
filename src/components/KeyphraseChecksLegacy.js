import { useMemo } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { CheckCircle, XCircle } from 'lucide-react';

/**
 * Check if keyphrase appears in text (case-insensitive).
 */
function contains( text, keyphrase ) {
    if ( ! text || ! keyphrase ) return false;
    return text.toLowerCase().includes( keyphrase.toLowerCase() );
}

export default function KeyphraseChecks( { keyphrase, seoTitle, metaDesc, lang } ) {
    const { permalink, blocks } = useSelect( ( select ) => {
        const editor = select( 'core/editor' );
        const blockEditor = select( 'core/block-editor' );
        return {
            permalink: editor?.getPermalink?.() || '',
            blocks: blockEditor?.getBlocks?.() || [],
        };
    }, [] );

    const checks = useMemo( () => {
        if ( ! keyphrase ) return [];

        const kw = keyphrase.toLowerCase();
        const escapedKw = kw.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );

        // Use shared extractor from theme (language-aware)
        const extract = window.awExtractContent;
        const allContent = extract ? extract( blocks, lang || 'nl' ) : [];
        const fullText = allContent.join( ' ' );
        const firstParagraph = allContent[ 0 ] || '';

        // For headings check, we look at content that likely came from heading attributes
        const hasInHeading = allContent.some( ( text ) => contains( text, keyphrase ) );

        // Count occurrences in body
        const bodyCount = ( fullText.toLowerCase().match( new RegExp( escapedKw, 'g' ) ) || [] ).length;

        // Slug from permalink
        const slug = decodeURIComponent( permalink ).toLowerCase();

        return [
            {
                id: 'title',
                pass: contains( seoTitle, keyphrase ),
                good: __( 'Keyphrase found in SEO title', 'snel-seo' ),
                bad: __( 'Keyphrase not found in SEO title', 'snel-seo' ),
            },
            {
                id: 'description',
                pass: contains( metaDesc, keyphrase ),
                good: __( 'Keyphrase found in meta description', 'snel-seo' ),
                bad: __( 'Keyphrase not found in meta description', 'snel-seo' ),
            },
            {
                id: 'first-content',
                pass: contains( firstParagraph, keyphrase ),
                good: __( 'Keyphrase found in the opening content', 'snel-seo' ),
                bad: __( 'Keyphrase not found in the opening content', 'snel-seo' ),
            },
            {
                id: 'body',
                pass: bodyCount >= 2,
                good: `${ __( 'Keyphrase appears', 'snel-seo' ) } ${ bodyCount }x ${ __( 'in the content', 'snel-seo' ) }`,
                bad: bodyCount === 1
                    ? __( 'Keyphrase appears only once in the content — try using it a bit more', 'snel-seo' )
                    : __( 'Keyphrase not found in the content', 'snel-seo' ),
            },
            {
                id: 'slug',
                pass: contains( slug, keyphrase.replace( /\s+/g, '-' ) ),
                good: __( 'Keyphrase found in URL', 'snel-seo' ),
                bad: __( 'Keyphrase not found in URL', 'snel-seo' ),
            },
        ];
    }, [ keyphrase, seoTitle, metaDesc, permalink, blocks, lang ] );

    if ( ! keyphrase ) return null;

    const passCount = checks.filter( ( c ) => c.pass ).length;

    return (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600">
                    { __( 'SEO Analysis', 'snel-seo' ) }
                </span>
                <span className={ `text-xs font-medium px-2 py-0.5 rounded-full ${
                    passCount === checks.length ? 'bg-emerald-100 text-emerald-700'
                        : passCount >= checks.length / 2 ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                }` }>
                    { passCount }/{ checks.length }
                </span>
            </div>
            <ul className="space-y-1.5">
                { checks.map( ( check ) => (
                    <li key={ check.id } className="flex items-start gap-2 text-xs text-gray-600">
                        { check.pass
                            ? <CheckCircle size={ 14 } className="text-emerald-500 mt-0.5 shrink-0" />
                            : <XCircle size={ 14 } className="text-red-400 mt-0.5 shrink-0" />
                        }
                        <span>{ check.pass ? check.good : check.bad }</span>
                    </li>
                ) ) }
            </ul>
        </div>
    );
}
