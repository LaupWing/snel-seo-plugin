import { Panel, PanelBody, Card, CardBody, Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function Tools() {
    return (
        <div>
            <h1>{ __( 'Tools', 'snel-seo' ) }</h1>
            <p style={ { color: '#666', marginBottom: '24px' } }>
                { __( 'Import, export, and manage your SEO configuration.', 'snel-seo' ) }
            </p>

            <Panel>
                <PanelBody title={ __( 'Import / Export', 'snel-seo' ) } initialOpen>
                    <Card>
                        <CardBody>
                            <p>{ __( 'Export your Snel SEO settings as a JSON file, or import settings from another site.', 'snel-seo' ) }</p>
                            <div style={ { display: 'flex', gap: '8px', marginTop: '12px' } }>
                                <Button variant="secondary">
                                    { __( 'Export Settings', 'snel-seo' ) }
                                </Button>
                                <Button variant="secondary">
                                    { __( 'Import Settings', 'snel-seo' ) }
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                </PanelBody>

                <PanelBody title={ __( 'Robots.txt', 'snel-seo' ) } initialOpen={ false }>
                    <Card>
                        <CardBody>
                            <p style={ { color: '#999' } }>
                                { __( 'Robots.txt editor coming soon.', 'snel-seo' ) }
                            </p>
                        </CardBody>
                    </Card>
                </PanelBody>
            </Panel>
        </div>
    );
}
