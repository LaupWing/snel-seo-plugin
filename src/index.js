import { createRoot } from '@wordpress/element';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Redirects from './pages/Redirects';
import Tools from './pages/Tools';

const PAGES = {
    dashboard: Dashboard,
    settings: Settings,
    redirects: Redirects,
    tools: Tools,
};

document.addEventListener( 'DOMContentLoaded', () => {
    const root = document.getElementById( 'snel-seo-root' );
    if ( ! root ) return;

    const page = root.dataset.page || 'dashboard';
    const PageComponent = PAGES[ page ] || Dashboard;

    createRoot( root ).render( <PageComponent /> );
} );
