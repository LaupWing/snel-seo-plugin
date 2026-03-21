import { createRoot } from '@wordpress/element';
import SeoMetaBox from './components/SeoMetaBox';
import './styles/main.css';

function mountMetaBox() {
    const container = document.getElementById( 'snel-seo-metabox-root' );
    if ( ! container ) return;

    createRoot( container ).render(
        <div className="snel-seo-app">
            <SeoMetaBox />
        </div>
    );
}

if ( document.readyState === 'loading' ) {
    document.addEventListener( 'DOMContentLoaded', mountMetaBox );
} else {
    mountMetaBox();
}
