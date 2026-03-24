import React, { useState, useEffect } from 'react';
import { migrateDataStructureIfNeeded } from './services/storageService';
import { generatePendingSalaries } from './utils/payrollUtils';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import FacturesPage from './pages/FacturesPage';
import DevisPage from './pages/DevisPage';
import SponsoringPage from './pages/SponsoringPage';
import ClientsPage from './pages/ClientsPage';
import ConfigPage from './pages/ConfigPage';
import RapportsPage from './pages/RapportsPage';
import CalculPage from './pages/CalculPage';
import FinancePage from './pages/FinancePage';
import HistoriquePage from './pages/HistoriquePage';
import BanquePage from './pages/BanquePage';
import './index.css';
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#fee2e2', color: '#991b1b', fontFamily: 'sans-serif', height: '100vh', overflow: 'auto' }}>
          <h2>Application Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', background: 'white', padding: '20px', borderRadius: '8px' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('mynds_auth_token') === 'true';
  });

  useEffect(() => {
    migrateDataStructureIfNeeded();
    generatePendingSalaries();
  }, []);

  const handleLogin = () => {
    localStorage.setItem('mynds_auth_token', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('mynds_auth_token');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <LoginPage onLogin={handleLogin} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/factures" element={<FacturesPage />} />
          <Route path="/devis" element={<DevisPage />} />
          <Route path="/sponsoring" element={<SponsoringPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/rapports" element={<RapportsPage />} />
          <Route path="/calcul" element={<CalculPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/historique" element={<HistoriquePage />} />
          <Route path="/banque" element={<BanquePage />} />
          <Route path="/configuration" element={<ConfigPage />} />
        </Routes>
      </Layout>
    </Router>
    </ErrorBoundary>
  );
}

export default App;
