import { createRoot } from '@wordpress/element';
import SeoMetaBox from './components/SeoMetaBox';
import './styles/main.css';

function mountMetaBox() {
    const container = document.getElementById( 'snel-seo-metabox-root' );
    if ( ! container ) return;

    const postId = parseInt( container.dataset.postId, 10 );
    createRoot( container ).render(
        <div className="snel-seo-app">
            <SeoMetaBox postId={ postId } />
        </div>
    );
}

// Meta boxes load after DOMContentLoaded in Gutenberg, use a small delay
if ( document.readyState === 'loading' ) {
    document.addEventListener( 'DOMContentLoaded', mountMetaBox );
} else {
    mountMetaBox();
}
