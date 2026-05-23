import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { installCookieBackedLocalStorage } from './lib/cookieBackedStorage';
import './index.css';

installCookieBackedLocalStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
