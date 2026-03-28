import { __ } from '@wordpress/i18n';

export default {
    type: 'Product',
    label: __( 'Product', 'snel-seo' ),
    description: __( 'For products with pricing, availability, and brand info. Shows rich results in Google.', 'snel-seo' ),
    fields: [
        { key: 'price',         label: __( 'Price', 'snel-seo' ),         input: 'meta',   description: __( 'Meta key that stores the price value', 'snel-seo' ) },
        { key: 'priceCurrency', label: __( 'Currency', 'snel-seo' ),      input: 'text',   description: __( 'ISO 4217 currency code', 'snel-seo' ),  placeholder: 'EUR' },
        { key: 'availability',  label: __( 'Sold field', 'snel-seo' ),     input: 'meta',   description: __( 'Meta key that marks a product as sold (truthy = Out of Stock, falsy = In Stock)', 'snel-seo' ) },
        { key: 'brand',        label: __( 'Brand', 'snel-seo' ),         input: 'text',   description: __( 'Brand or manufacturer name', 'snel-seo' ),  placeholder: '' },
        { key: 'sku',          label: __( 'SKU', 'snel-seo' ),           input: 'meta',   description: __( 'Meta key for product SKU / article number', 'snel-seo' ) },
        { key: 'taxonomy',     label: __( 'Category taxonomy', 'snel-seo' ), input: 'taxonomy', description: __( 'Used for breadcrumbs', 'snel-seo' ) },
    ],
};
