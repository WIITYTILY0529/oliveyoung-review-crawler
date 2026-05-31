import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { CrawlProvider } from './context/CrawlContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CrawlProvider>
        <App />
      </CrawlProvider>
    </BrowserRouter>
  </StrictMode>,
);
