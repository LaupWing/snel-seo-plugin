import { useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const BADGE_GROUPS = {
    homepage: [
        { label: 'Site Name', value: '%%sitename%%' },
        { label: 'Tagline', value: '%%sitedesc%%' },
        { label: 'Separator', value: '%%separator%%' },
    ],
    page: [
        { label: 'Page Title', value: '%%title%%' },
        { label: 'Site Name', value: '%%sitename%%' },
        { label: 'Separator', value: '%%separator%%' },
    ],
    post: [
        { label: 'Post Title', value: '%%title%%' },
        { label: 'Site Name', value: '%%sitename%%' },
        { label: 'Separator', value: '%%separator%%' },
        { label: 'Category', value: '%%category%%' },
    ],
};

export default function TemplateInput( { label, value, onChange, badgeGroup, preview, maxLength } ) {
    const inputRef = useRef( null );
    const badges = BADGE_GROUPS[ badgeGroup ] || BADGE_GROUPS.page;

    const insertVariable = ( variable ) => {
        const input = inputRef.current;
        if ( ! input ) {
            onChange( ( value || '' ) + variable );
            return;
        }

        const start = input.selectionStart;
        const end = input.selectionEnd;
        const before = ( value || '' ).substring( 0, start );
        const after = ( value || '' ).substring( end );
        const newValue = before + variable + after;
        onChange( newValue );

        // Move cursor after inserted variable
        requestAnimationFrame( () => {
            const newPos = start + variable.length;
            input.setSelectionRange( newPos, newPos );
            input.focus();
        } );
    };

    const isTextarea = maxLength > 0;
    const InputTag = isTextarea ? 'textarea' : 'input';

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                { label }
            </label>
            <InputTag
                ref={ inputRef }
                type={ isTextarea ? undefined : 'text' }
                value={ value || '' }
                onChange={ ( e ) => onChange( e.target.value ) }
                rows={ isTextarea ? 3 : undefined }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
                { badges.map( ( badge ) => (
                    <button
                        key={ badge.value }
                        type="button"
                        onClick={ () => insertVariable( badge.value ) }
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                        { badge.label }
                    </button>
                ) ) }
            </div>

            {/* Character count */}
            { maxLength > 0 && value && (
                <p className={ `mt-1 text-xs ${ value.length > maxLength ? 'text-red-500' : 'text-gray-400' }` }>
                    { value.length } / { maxLength } { __( 'characters', 'snel-seo' ) }
                </p>
            ) }
        </div>
    );
}
