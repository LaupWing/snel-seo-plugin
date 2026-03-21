import { __ } from '@wordpress/i18n';

export default function GooglePreview( { title, url, description } ) {
    const displayTitle = title || __( 'Page Title', 'snel-seo' );
    const displayUrl = url || 'https://example.com';
    const displayDesc = description || __( 'No meta description set. Google will auto-generate a snippet from your page content.', 'snel-seo' );

    // Truncate like Google does
    const truncatedTitle = displayTitle.length > 60
        ? displayTitle.substring( 0, 57 ) + '...'
        : displayTitle;

    const truncatedDesc = displayDesc.length > 160
        ? displayDesc.substring( 0, 157 ) + '...'
        : displayDesc;

    // Parse URL for display
    const urlParts = displayUrl.replace( /^https?:\/\//, '' ).split( '/' ).filter( Boolean );
    const domain = urlParts[ 0 ] || 'example.com';
    const path = urlParts.slice( 1 ).join( ' › ' );

    return (
        <div className="mt-6 p-5 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-1.5 mb-3">
                <svg width="14" height="14" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#34A853" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.77-4.59l-7.98-6.19A23.99 23.99 0 000 24c0 3.77.9 7.35 2.56 10.52l7.97-5.93z"/>
                    <path fill="#FBBC05" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.93C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    { __( 'Google Preview', 'snel-seo' ) }
                </p>
            </div>

            {/* Google result card */}
            <div className="max-w-[600px]">
                {/* Favicon + URL row */}
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                        { window.snelSeo?.favicon ? (
                            <img src={ window.snelSeo.favicon } alt="" className="w-5 h-5 rounded-sm object-contain" />
                        ) : (
                            <div className="w-4 h-4 bg-gray-300 rounded-sm" />
                        ) }
                    </div>
                    <div>
                        <p className="text-sm text-gray-800">{ domain }</p>
                        { path && (
                            <p className="text-xs text-gray-500">{ path }</p>
                        ) }
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-xl text-blue-800 font-normal leading-snug mb-1 cursor-pointer hover:underline" style={ { fontFamily: 'arial, sans-serif' } }>
                    { truncatedTitle }
                </h3>

                {/* Description */}
                <p className="text-sm leading-relaxed" style={ { color: '#4d5156', fontFamily: 'arial, sans-serif' } }>
                    { truncatedDesc }
                </p>
            </div>
        </div>
    );
}
