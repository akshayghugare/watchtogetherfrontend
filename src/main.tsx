import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/redux/store';
import App from '@/App';
import '@/styles/globals.css';

// NOTE: StrictMode is intentionally off — its dev-mode double-mount breaks
// react-player's YouTube integration ("player was not available" and a
// permanently black embed).
ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>,
);
