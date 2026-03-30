import { initRouter } from './router.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('AnimeTracker OS initializing...');
  
  // Set up navigation
  document.getElementById('nav-dashboard').addEventListener('click', () => window.location.hash = '#/dashboard');
  document.getElementById('nav-browse').addEventListener('click', () => window.location.hash = '#/browse');
  document.getElementById('nav-library').addEventListener('click', () => window.location.hash = '#/library');
  document.getElementById('nav-ai-advisor').addEventListener('click', () => window.location.hash = '#/ai-advisor');

  // Initialize Router
  initRouter();
});
