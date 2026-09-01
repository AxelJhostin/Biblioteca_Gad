import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './state/AuthContext.jsx';
import { RequestProvider } from './state/RequestContext.jsx';
import { ClientAuthProvider } from './state/ClientAuthContext.jsx';
import App from './App.jsx';
import './styles.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ClientAuthProvider>
          <RequestProvider>
            <App />
          </RequestProvider>
        </ClientAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
