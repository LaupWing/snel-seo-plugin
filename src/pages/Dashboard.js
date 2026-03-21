import { __ } from '@wordpress/i18n';
import { Search, Settings, ArrowRight, Shield, Globe } from 'lucide-react';

export default function Dashboard() {
    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-xl font-bold text-gray-900">
                    Snel <em className="font-serif font-normal italic">SEO</em>
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    { __( 'Lightweight SEO toolkit by Snelstack', 'snel-seo' ) } — v{ window.snelSeo?.version }
                </p>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Site overview */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <Globe size={ 16 } className="text-blue-600" />
                        </div>
                        <h2 className="text-sm font-semibold text-gray-900">
                            { __( 'Site Overview', 'snel-seo' ) }
                        </h2>
                    </div>
                    <div className="space-y-2 text-sm">
                        <p className="text-gray-600">
                            <span className="text-gray-400">{ __( 'Site:', 'snel-seo' ) }</span>{ ' ' }
                            { window.snelSeo?.siteName }
                        </p>
                        <p className="text-gray-600">
                            <span className="text-gray-400">{ __( 'URL:', 'snel-seo' ) }</span>{ ' ' }
                            { window.snelSeo?.siteUrl }
                        </p>
                        <p className="text-gray-600">
                            <span className="text-gray-400">{ __( 'Tagline:', 'snel-seo' ) }</span>{ ' ' }
                            { window.snelSeo?.siteDesc || '—' }
                        </p>
                    </div>
                </div>

                {/* Quick actions */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                            <Settings size={ 16 } className="text-emerald-600" />
                        </div>
                        <h2 className="text-sm font-semibold text-gray-900">
                            { __( 'Quick Actions', 'snel-seo' ) }
                        </h2>
                    </div>
                    <div className="space-y-2">
                        <a href="?page=snel-seo-settings" className="flex items-center justify-between text-sm text-gray-600 hover:text-blue-600 transition-colors">
                            { __( 'Configure SEO settings', 'snel-seo' ) }
                            <ArrowRight size={ 14 } />
                        </a>
                        <a href="?page=snel-seo-redirects" className="flex items-center justify-between text-sm text-gray-600 hover:text-blue-600 transition-colors">
                            { __( 'Manage redirects', 'snel-seo' ) }
                            <ArrowRight size={ 14 } />
                        </a>
                        <a href="?page=snel-seo-tools" className="flex items-center justify-between text-sm text-gray-600 hover:text-blue-600 transition-colors">
                            { __( 'Import / Export', 'snel-seo' ) }
                            <ArrowRight size={ 14 } />
                        </a>
                    </div>
                </div>

                {/* SEO health */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                            <Shield size={ 16 } className="text-amber-600" />
                        </div>
                        <h2 className="text-sm font-semibold text-gray-900">
                            { __( 'SEO Health', 'snel-seo' ) }
                        </h2>
                    </div>
                    <p className="text-sm text-gray-400 italic">
                        { __( 'Health checks coming soon — orphaned content, stale pages, missing meta descriptions.', 'snel-seo' ) }
                    </p>
                </div>
            </div>
        </div>
    );
}
