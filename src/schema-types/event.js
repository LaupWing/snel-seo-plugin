import { __ } from '@wordpress/i18n';

export default {
    type: 'Event',
    label: __( 'Event', 'snel-seo' ),
    description: __( 'For events with dates, locations, and ticket info. Shows event cards in Google.', 'snel-seo' ),
    fields: [
        { key: 'startDate',    label: __( 'Start date field', 'snel-seo' ),  input: 'meta',   description: __( 'Meta key storing the event start date (ISO 8601)', 'snel-seo' ) },
        { key: 'endDate',      label: __( 'End date field', 'snel-seo' ),    input: 'meta',   description: __( 'Meta key storing the event end date', 'snel-seo' ) },
        { key: 'locationName', label: __( 'Venue name', 'snel-seo' ),        input: 'text',   description: '', placeholder: '' },
        { key: 'locationAddress', label: __( 'Venue address', 'snel-seo' ),  input: 'text',   description: '', placeholder: '' },
        { key: 'price',        label: __( 'Ticket price field', 'snel-seo' ), input: 'meta',  description: __( 'Meta key for ticket price', 'snel-seo' ) },
        { key: 'priceCurrency', label: __( 'Currency', 'snel-seo' ),         input: 'text',   description: '', placeholder: 'EUR' },
        { key: 'taxonomy',     label: __( 'Category taxonomy', 'snel-seo' ), input: 'taxonomy', description: __( 'Used for breadcrumbs', 'snel-seo' ) },
    ],
};
