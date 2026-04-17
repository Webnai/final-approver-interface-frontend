
import { createRoot } from 'react-dom/client';
import { PersistGate } from 'redux-persist/integration/react';
import { Provider } from 'react-redux';
import App from './app/App.tsx';
import { persistor, store } from '@/app/store/store';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <App />
    </PersistGate>
  </Provider>,
);
  