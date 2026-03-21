import { Panel, PanelBody, Card, CardBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function Redirects() {
    return (
        <div>
            <h1>{ __( 'Redirects', 'snel-seo' ) }</h1>
            <p style={ { color: '#666', marginBottom: '24px' } }>
                { __( 'Manage 301 redirects. Automatically suggested when pages are deleted or moved.', 'snel-seo' ) }
            </p>

            <Panel>
                <PanelBody title={ __( 'Active Redirects', 'snel-seo' ) } initialOpen>
                    <Card>
                        <CardBody>
                            <p style={ { color: '#999' } }>
                                { __( 'No redirects configured yet. Redirects will appear here when you add them.', 'snel-seo' ) }
                            </p>
                        </CardBody>
                    </Card>
                </PanelBody>
            </Panel>
        </div>
    );
}
