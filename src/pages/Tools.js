import { __ } from '@wordpress/i18n';
import { Download, Upload, FileCode } from 'lucide-react';

export default function Tools() {
    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">
                    { __( 'Tools', 'snel-seo' ) }
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    { __( 'Import, export, and manage your SEO configuration.', 'snel-seo' ) }
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <Download size={ 16 } className="text-blue-600" />
                        </div>
                        <h2 className="text-sm font-semibold text-gray-900">
                            { __( 'Export Settings', 'snel-seo' ) }
                        </h2>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                        { __( 'Download your Snel SEO settings as a JSON file. Use this to copy settings to another site.', 'snel-seo' ) }
                    </p>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                        <Download size={ 14 } />
                        { __( 'Export JSON', 'snel-seo' ) }
                    </button>
                </div>

                {/* Import */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                            <Upload size={ 16 } className="text-emerald-600" />
                        </div>
                        <h2 className="text-sm font-semibold text-gray-900">
                            { __( 'Import Settings', 'snel-seo' ) }
                        </h2>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                        { __( 'Upload a Snel SEO JSON file to restore settings from another site.', 'snel-seo' ) }
                    </p>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                        <Upload size={ 14 } />
                        { __( 'Import JSON', 'snel-seo' ) }
                    </button>
                </div>

                {/* Robots.txt */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 md:col-span-2">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                            <FileCode size={ 16 } className="text-amber-600" />
                        </div>
                        <h2 className="text-sm font-semibold text-gray-900">
                            { __( 'Robots.txt', 'snel-seo' ) }
                        </h2>
                    </div>
                    <p className="text-sm text-gray-400 italic">
                        { __( 'Robots.txt editor coming soon.', 'snel-seo' ) }
                    </p>
                </div>
            </div>
        </div>
    );
}
