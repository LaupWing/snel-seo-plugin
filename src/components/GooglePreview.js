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
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                { __( 'Google Preview', 'snel-seo' ) }
            </p>

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
