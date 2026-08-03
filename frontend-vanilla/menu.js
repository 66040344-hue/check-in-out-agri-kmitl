import { initAuth, logoutUser } from './auth.js';
import { getQueryParam, loadCurrentSubject } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  
  const roomId = getQueryParam('room') || 'Unknown';
  document.getElementById('room-id-display').textContent = roomId;
  loadCurrentSubject(roomId, 'subject-display', 'time-display', 'time-container');
  
  initAuth((user) => {
    if (!user) {
      window.location.href = `index.html?room=${roomId}`;
    } else {
      document.getElementById('user-name').textContent = user.displayName;
      document.getElementById('user-email').textContent = user.email;
    }
  });

  document.getElementById('btn-check-in').addEventListener('click', () => {
    window.location.href = `check-in.html?room=${roomId}`;
  });

  document.getElementById('btn-check-out').addEventListener('click', () => {
    window.location.href = `check-out.html?room=${roomId}`;
  });

  document.getElementById('btn-history').addEventListener('click', () => {
    window.location.href = `history.html?room=${roomId}`;
  });

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await logoutUser();
    window.location.href = `index.html?room=${roomId}`;
  });
});
