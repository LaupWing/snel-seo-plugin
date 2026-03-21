import { Panel, PanelBody, Card, CardBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function Dashboard() {
    return (
        <div>
            <h1>{ __( 'Snel SEO', 'snel-seo' ) }</h1>
            <p style={ { color: '#666', marginBottom: '24px' } }>
                { __( 'Lightweight SEO toolkit by Snelstack.', 'snel-seo' ) } v{ window.snelSeo?.version }
            </p>

            <Panel>
                <PanelBody title={ __( 'Site Overview', 'snel-seo' ) } initialOpen>
                    <Card>
                        <CardBody>
                            <p><strong>{ __( 'Site:', 'snel-seo' ) }</strong> { window.snelSeo?.siteName }</p>
                            <p><strong>{ __( 'URL:', 'snel-seo' ) }</strong> { window.snelSeo?.siteUrl }</p>
                            <p><strong>{ __( 'Tagline:', 'snel-seo' ) }</strong> { window.snelSeo?.siteDesc || '—' }</p>
                        </CardBody>
                    </Card>
                </PanelBody>

                <PanelBody title={ __( 'Quick Actions', 'snel-seo' ) } initialOpen>
                    <Card>
                        <CardBody>
                            <ul style={ { margin: 0, paddingLeft: '20px' } }>
                                <li><a href="?page=snel-seo-settings">{ __( 'Configure SEO settings', 'snel-seo' ) }</a></li>
                                <li><a href="?page=snel-seo-redirects">{ __( 'Manage redirects', 'snel-seo' ) }</a></li>
                                <li><a href="?page=snel-seo-tools">{ __( 'Import / Export', 'snel-seo' ) }</a></li>
                            </ul>
                        </CardBody>
                    </Card>
                </PanelBody>
            </Panel>
        </div>
    );
}
