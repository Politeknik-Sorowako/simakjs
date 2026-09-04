import { Router } from '@solidjs/router';
import { render } from 'solid-js/web';
import App from './App';
import './index.css';

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error('Root element not found. Easy to fix: add <div id="root"></div> to your index.html');
}

render(
  () => (
    <Router>
      <App />
    </Router>
  ),
  root!,
);
