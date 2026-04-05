import { __ } from '@wordpress/i18n';

/**
 * Check if a string contains only template tags (%%tag%%) and whitespace.
 * If so, it doesn't need translation.
 */
export function isTemplateOnly( value ) {
    if ( ! value || typeof value !== 'string' ) return false;
    return value.replace( /%%\w+%%/g, '' ).trim() === '';
}

/**
 * Shared language switcher with status indicator dots.
 *
 * @param {Object}   props
 * @param {Array}    props.languages    - Array of { code, label, default }
 * @param {string}   props.activeLang   - Currently selected language code
 * @param {string}   props.defaultLang  - Default language code
 * @param {Function} props.onChange     - Called with lang code on click
 * @param {Function} props.getStatus   - (langCode) => 'complete' | 'partial' | 'empty'
 * @param {string}   [props.size='md'] - 'sm' for compact (tagline), 'md' for full
 * @param {React.ReactNode} [props.children] - Optional inline content after tabs (e.g. Translate button)
 */
export default function LangSwitcher( { languages, activeLang, defaultLang, onChange, getStatus, size = 'md', children } ) {
    const sizeClasses = size === 'sm'
        ? 'px-2 py-0.5 text-[11px]'
        : 'px-2.5 py-1 text-xs';

    const dotColors = {
        complete: 'bg-emerald-400',
        partial: 'bg-amber-400',
        empty: 'bg-gray-300',
    };

    return (
        <div className="flex items-center gap-1">
            { languages.map( ( lang ) => {
                const status = lang.default ? null : getStatus( lang.code );
                return (
                    <button
                        key={ lang.code }
                        onClick={ () => onChange( lang.code ) }
                        className={ `${ sizeClasses } font-medium rounded-md transition-colors ${ activeLang === lang.code
                            ? lang.default ? 'bg-blue-600 text-white ring-2 ring-blue-300' : 'bg-blue-600 text-white'
                            : lang.default ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }` }
                    >
                        { lang.label }
                        { lang.default && (
                            <span className="ml-0.5 text-[10px]">({ __( 'default', 'snel-seo' ) })</span>
                        ) }
                        { status && (
                            <span className={ `ml-1 inline-block w-1.5 h-1.5 ${ dotColors[ status ] } rounded-full` } />
                        ) }
                    </button>
                );
            } ) }
            { children }
        </div>
    );
}
