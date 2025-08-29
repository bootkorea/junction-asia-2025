// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './assets/fonts/font.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';

const root = createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

