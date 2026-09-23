import React from 'react';
import { createRoot } from 'react-dom/client';
import ChatWidget from './ChatWidget';
import styles from './widget.css?inline';

// Runtime configuration, so a portable build never embeds a teammate's LAN address.
const script = document.currentScript;
export function mountWidget({ apiBase = '' } = {}) {
  if (document.getElementById('ekt-ai-chat')) return;
  const host = document.createElement('div');
  host.id = 'ekt-ai-chat';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles;
  const container = document.createElement('div');
  shadow.append(style, container);
  document.body.append(host);
  createRoot(container).render(<ChatWidget apiBase={apiBase} />);
}
if (script?.hasAttribute('data-ekt-widget')) {
  const apiBase = script.dataset.apiBase || '';
  if (document.body) mountWidget({ apiBase });
  else document.addEventListener('DOMContentLoaded', () => mountWidget({ apiBase }), { once: true });
}
