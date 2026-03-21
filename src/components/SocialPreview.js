import { __ } from '@wordpress/i18n';

const FacebookIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
);

const XIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#000000">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
);

const LinkedInIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#0A66C2">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
);

function ImagePlaceholder() {
    return (
        <div className="text-center px-4">
            <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                </svg>
            </div>
            <p className="text-xs font-medium text-gray-500">{ __( 'No featured image set', 'snel-seo' ) }</p>
            <p className="text-xs text-gray-400 mt-0.5">{ __( 'Set a featured image to control how this page looks when shared.', 'snel-seo' ) }</p>
        </div>
    );
}

function ImageArea( { imageUrl } ) {
    return (
        <div className="w-full h-[200px] bg-gray-100 flex items-center justify-center">
            { imageUrl ? (
                <img src={ imageUrl } alt="" className="w-full h-full object-cover" />
            ) : (
                <ImagePlaceholder />
            ) }
        </div>
    );
}

export default function SocialPreview( { title, description, url, imageUrl } ) {
    const displayTitle = title || __( 'Page Title', 'snel-seo' );
    const displayDesc = description || __( 'No description set.', 'snel-seo' );
    const displayUrl = url || 'example.com';
    const domain = displayUrl.replace( /^https?:\/\//, '' ).split( '/' )[ 0 ];

    return (
        <div className="space-y-6">
            {/* Facebook */}
            <div>
                <div className="flex items-center gap-1.5 mb-2">
                    <FacebookIcon />
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Facebook</p>
                </div>
                <div className="max-w-[500px] border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <ImageArea imageUrl={ imageUrl } />
                    <div className="p-3 bg-gray-50 border-t border-gray-200">
                        <p className="text-xs text-gray-500 uppercase">{ domain }</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5 leading-snug">
                            { displayTitle.length > 65 ? displayTitle.substring( 0, 62 ) + '...' : displayTitle }
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                            { displayDesc.length > 155 ? displayDesc.substring( 0, 152 ) + '...' : displayDesc }
                        </p>
                    </div>
                </div>
            </div>

            {/* X (Twitter) */}
            <div>
                <div className="flex items-center gap-1.5 mb-2">
                    <XIcon />
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">X</p>
                </div>
                <div className="max-w-[500px] border border-gray-200 rounded-2xl overflow-hidden bg-white">
                    <ImageArea imageUrl={ imageUrl } />
                    <div className="p-3">
                        <p className="text-sm text-gray-900 leading-snug">
                            { displayTitle.length > 70 ? displayTitle.substring( 0, 67 ) + '...' : displayTitle }
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            { displayDesc.length > 130 ? displayDesc.substring( 0, 127 ) + '...' : displayDesc }
                        </p>
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                            { domain }
                        </p>
                    </div>
                </div>
            </div>

            {/* LinkedIn */}
            <div>
                <div className="flex items-center gap-1.5 mb-2">
                    <LinkedInIcon />
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">LinkedIn</p>
                </div>
                <div className="max-w-[500px] border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <ImageArea imageUrl={ imageUrl } />
                    <div className="p-3 bg-gray-50 border-t border-gray-200">
                        <p className="text-sm font-semibold text-gray-900 leading-snug">
                            { displayTitle.length > 70 ? displayTitle.substring( 0, 67 ) + '...' : displayTitle }
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{ domain }</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
