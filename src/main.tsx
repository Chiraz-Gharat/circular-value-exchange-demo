import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Home from './components/workspace';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Anwendungseinstieg fehlt.');
createRoot(root).render(<StrictMode><Home /></StrictMode>);
