import { renderDashboard } from './pages/dashboard.js';
import { renderBrowse }    from './pages/browse.js';
import { renderLibrary }   from './pages/library.js';
import { renderAiAdvisor } from './pages/ai-advisor.js';
import { renderStats }     from './pages/stats.js';
import { renderSettings }  from './pages/settings.js';

export function initRouter() {
  window.addEventListener('hashchange', handleRouteChange);

  if (!window.location.hash) {
    window.location.hash = '#/dashboard';
  } else {
    handleRouteChange();
  }
}

function handleRouteChange() {
  const hash = window.location.hash;
  const root = document.getElementById('app-root');

  if (document.getElementById('modal-container')) {
    document.getElementById('modal-container').innerHTML = '';
    document.getElementById('modal-container').style.display = 'none';
  }

  root.innerHTML = '<div class="flex items-center justify-center gap-4" style="height: 200px;"><p>Loading...</p></div>';

  if      (hash === '#/dashboard')  renderDashboard(root);
  else if (hash === '#/browse')     renderBrowse(root);
  else if (hash === '#/library')    renderLibrary(root);
  else if (hash === '#/ai-advisor') renderAiAdvisor(root);
  else if (hash === '#/stats')      renderStats(root);
  else if (hash === '#/settings')   renderSettings(root);
  else window.location.hash = '#/dashboard';
}
