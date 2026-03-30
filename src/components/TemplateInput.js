import { useRef } from '@wordpress/element';
import { Tooltip } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { RotateCcw } from 'lucide-react';
import { TEMPLATE_BADGES } from '../config';

export default function TemplateInput( { label, value, onChange, badgeGroup, maxLength, defaultValue, action, placeholder, showReset: showResetProp } ) {
    const inputRef = useRef( null );
    const badges = badgeGroup ? ( TEMPLATE_BADGES[ badgeGroup ] || [] ) : [];

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

    const showReset = showResetProp !== false && defaultValue && value !== defaultValue;

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                        { label }
                    </label>
                    { action }
                </div>
                { showReset && (
                    <button
                        type="button"
                        onClick={ () => onChange( defaultValue ) }
                        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
                    >
                        <RotateCcw size={ 12 } />
                        { __( 'Reset', 'snel-seo' ) }
                    </button>
                ) }
            </div>
            <InputTag
                ref={ inputRef }
                type={ isTextarea ? undefined : 'text' }
                value={ value || '' }
                onChange={ ( e ) => onChange( e.target.value ) }
                onKeyDown={ ( e ) => e.stopPropagation() }
                placeholder={ placeholder || '' }
                rows={ isTextarea ? 3 : undefined }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_1px_#3b82f6] resize-none"
            />

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
                { badges.map( ( badge ) => (
                    <Tooltip key={ badge.value } text={ badge.tip } delay={ 100 }>
                        <button
                            type="button"
                            onClick={ () => insertVariable( badge.value ) }
                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                            { badge.label }
                        </button>
                    </Tooltip>
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
