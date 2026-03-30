export function showModal(title, contentHtml, onConfirm = null, config = {}) {
  const container = document.getElementById('modal-container');
  if (!container) return;

  const confirmText = config.confirmText || 'Confirm';
  const cancelText = config.cancelText || 'Cancel';
  const hideCancel = config.hideCancel || false;

  const buttonsHtml = `
    <menu class="dialog-menu" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
      ${!hideCancel ? `<button class="nes-btn cancel-btn">${cancelText}</button>` : ''}
      ${onConfirm ? `<button class="nes-btn is-primary confirm-btn">${confirmText}</button>` : ''}
      ${!onConfirm && hideCancel ? `<button class="nes-btn cancel-btn is-primary">Close</button>` : ''}
    </menu>
  `;

  container.innerHTML = `
    <div class="nes-dialog is-dark" style="animation: none; width: 90%; max-width: 800px;">
      <p class="title" style="color: var(--pixel-cyan);">${title}</p>
      <div class="modal-content" style="margin-top: 15px;">
        ${contentHtml}
      </div>
      ${buttonsHtml}
    </div>
  `;

  container.style.display = 'flex';

  const close = () => { container.style.display = 'none'; container.innerHTML = ''; };

  const cancelBtn = container.querySelector('.cancel-btn');
  if (cancelBtn) cancelBtn.onclick = close;

  const confirmBtn = container.querySelector('.confirm-btn');
  if (confirmBtn) {
    confirmBtn.onclick = async () => {
      if (onConfirm) await onConfirm();
      close();
    };
  }
}
