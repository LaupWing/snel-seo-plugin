import { useState, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Languages } from 'lucide-react';

/**
 * Reusable animated translate button.
 *
 * Props:
 * - onTranslate: async function that receives { animateText } helper.
 *   Call animateText('✦ EN...') to update the button label with slide animation.
 * - disabled: boolean
 * - label: string (default text, e.g. "Translate All" or "Translate")
 * - className: optional extra classes
 * - size: 'sm' (inline, 11px) or 'md' (pill, 12px). Default 'md'.
 */
export default function TranslateButton( { onTranslate, disabled, label, className = '', size = 'md' } ) {
    const [ btnText, setBtnText ] = useState( null );
    const [ btnAnimStyle, setBtnAnimStyle ] = useState( {} );
    const [ running, setRunning ] = useState( false );

    const animateText = useCallback( ( text ) => {
        return new Promise( ( resolve ) => {
            setBtnAnimStyle( { transform: 'translateY(-100%)', opacity: 0, transition: 'all 0.2s ease-in' } );
            setTimeout( () => {
                setBtnText( text );
                setBtnAnimStyle( { transform: 'translateY(100%)', opacity: 0, transition: 'none' } );
                requestAnimationFrame( () => {
                    requestAnimationFrame( () => {
                        setBtnAnimStyle( { transform: 'translateY(0)', opacity: 1, transition: 'all 0.25s ease-out' } );
                        setTimeout( resolve, 250 );
                    } );
                } );
            }, 200 );
        } );
    }, [] );

    const handleClick = async () => {
        setRunning( true );
        try {
            await onTranslate( { animateText } );
        } finally {
            setBtnText( null );
            setBtnAnimStyle( {} );
            setRunning( false );
        }
    };

    const sizeClasses = size === 'sm'
        ? 'min-w-[90px] px-2 py-0.5 text-[11px]'
        : 'min-w-[140px] h-[28px] px-3 py-1 text-xs';

    return (
        <button
            type="button"
            onClick={ handleClick }
            disabled={ disabled || running }
            className={ `font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-full overflow-hidden inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${ sizeClasses } ${ className }` }
        >
            { btnText ? (
                <span className={ `inline-block ${ btnText.includes( '...' ) ? 'animate-pulse' : '' }` } style={ btnAnimStyle }>
                    { btnText }
                </span>
            ) : (
                <span className="inline-flex items-center gap-1.5">
                    <Languages size={ size === 'sm' ? 10 : 12 } />
                    { label || __( 'Translate', 'snel-seo' ) }
                </span>
            ) }
        </button>
    );
}
