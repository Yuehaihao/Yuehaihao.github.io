import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const access = (window as any).YeuhubAccess;
let gateTimer: ReturnType<typeof setTimeout>;
function guard() {
  clearTimeout(gateTimer);
  const left = access?.remainingMs() || 0;
  if (left <= 0) {
    document.getElementById('root')!.hidden = true;
    window.location.replace('../index.html#work');
    return false;
  }
  gateTimer = setTimeout(guard, left + 50);
  return true;
}
window.addEventListener('storage', guard);
window.addEventListener('pageshow', guard);
document.addEventListener('visibilitychange', () => { if (!document.hidden) guard(); });
if (guard()) createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
