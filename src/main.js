import { initRouter } from './router.js';
import { getSettings } from './store/settings.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('AniMind OS initializing...');

  // Apply saved settings before render
  const settings = getSettings();
  const scanlinesEl = document.querySelector('.scanlines');
  if (scanlinesEl) scanlinesEl.style.display = settings.scanlines ? 'block' : 'none';

  // Navigation
  document.getElementById('nav-dashboard') .addEventListener('click', () => window.location.hash = '#/dashboard');
  document.getElementById('nav-browse')    .addEventListener('click', () => window.location.hash = '#/browse');
  document.getElementById('nav-library')   .addEventListener('click', () => window.location.hash = '#/library');
  document.getElementById('nav-stats')     .addEventListener('click', () => window.location.hash = '#/stats');
  document.getElementById('nav-ai-advisor').addEventListener('click', () => window.location.hash = '#/ai-advisor');
  document.getElementById('nav-settings')  .addEventListener('click', () => window.location.hash = '#/settings');

  initRouter();
});
