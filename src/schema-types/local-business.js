import { __ } from '@wordpress/i18n';

export default {
    type: 'LocalBusiness',
    label: __( 'Local Business', 'snel-seo' ),
    description: __( 'For businesses with a physical location. Shows address, phone, and hours in Google.', 'snel-seo' ),
    fields: [
        { key: 'streetAddress',   label: __( 'Street address', 'snel-seo' ),   input: 'text', description: '', placeholder: 'Kerkstraat 1' },
        { key: 'addressLocality', label: __( 'City', 'snel-seo' ),             input: 'text', description: '', placeholder: 'Amsterdam' },
        { key: 'postalCode',      label: __( 'Postal code', 'snel-seo' ),      input: 'text', description: '', placeholder: '1012 AB' },
        { key: 'addressCountry',  label: __( 'Country', 'snel-seo' ),          input: 'text', description: '', placeholder: 'NL' },
        { key: 'telephone',       label: __( 'Phone', 'snel-seo' ),            input: 'text', description: '', placeholder: '+31 30 123 4567' },
        { key: 'openingHours',    label: __( 'Opening hours', 'snel-seo' ),    input: 'text', description: __( 'e.g. Mo-Fr 09:00-17:00, Sa 10:00-16:00', 'snel-seo' ), placeholder: 'Mo-Fr 09:00-17:00' },
        { key: 'priceRange',      label: __( 'Price range', 'snel-seo' ),      input: 'text', description: __( 'e.g. €€ or $50-$500', 'snel-seo' ), placeholder: '€€' },
    ],
};
