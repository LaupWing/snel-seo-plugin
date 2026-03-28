import { __ } from '@wordpress/i18n';

export default {
    type: 'Article',
    label: __( 'Article', 'snel-seo' ),
    description: __( 'For blog posts, news articles, and editorial content. Helps Google show headlines and author info.', 'snel-seo' ),
    fields: [
        { key: 'authorName',    label: __( 'Author name', 'snel-seo' ),     input: 'text',   description: __( 'Static author name, or leave empty to use post author', 'snel-seo' ), placeholder: '' },
        { key: 'publisherName', label: __( 'Publisher name', 'snel-seo' ),   input: 'text',   description: __( 'Organization or site name', 'snel-seo' ),  placeholder: '' },
        { key: 'taxonomy',      label: __( 'Category taxonomy', 'snel-seo' ), input: 'taxonomy', description: __( 'Used for article section and breadcrumbs', 'snel-seo' ) },
    ],
};
