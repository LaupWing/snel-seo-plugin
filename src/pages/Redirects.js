import { __ } from '@wordpress/i18n';
import { ArrowRightLeft, Plus } from 'lucide-react';

export default function Redirects() {
    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">
                        { __( 'Redirects', 'snel-seo' ) }
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        { __( 'Manage 301 redirects. Automatically suggested when pages are deleted or moved.', 'snel-seo' ) }
                    </p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                    <Plus size={ 16 } />
                    { __( 'Add Redirect', 'snel-seo' ) }
                </button>
            </div>

            {/* Empty state */}
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ArrowRightLeft size={ 20 } className="text-gray-400" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900 mb-1">
                    { __( 'No redirects yet', 'snel-seo' ) }
                </h2>
                <p className="text-sm text-gray-500">
                    { __( 'Redirects will appear here when you add them or when pages are deleted.', 'snel-seo' ) }
                </p>
            </div>
        </div>
    );
}
