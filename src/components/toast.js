export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  // types: success, error, warning
  const nesClass = type === 'error' ? 'is-error' : (type === 'warning' ? 'is-warning' : 'is-success');
  toast.className = `toast nes-container is-rounded is-dark ${nesClass}`;
  toast.innerHTML = `<p style="margin:0">${message}</p>`;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    if(container.contains(toast)) {
      container.removeChild(toast);
    }
  }, 3300);
}
