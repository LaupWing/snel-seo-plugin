import { createRoot } from '@wordpress/element';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Redirects from './pages/Redirects';
import Tools from './pages/Tools';
import './styles/main.css';

const PAGES = {
    dashboard: Dashboard,
    settings: Settings,
    redirects: Redirects,
    tools: Tools,
};

function mountApp() {
    const container = document.getElementById( 'snel-seo-root' );
    if ( ! container ) return;

    const page = container.dataset.page || 'dashboard';
    const PageComponent = PAGES[ page ] || Dashboard;

    createRoot( container ).render(
        <div className="snel-seo-app">
            <PageComponent />
        </div>
    );
}

if ( document.readyState === 'loading' ) {
    document.addEventListener( 'DOMContentLoaded', mountApp );
} else {
    mountApp();
}
