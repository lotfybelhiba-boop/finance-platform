import React, { useState, useEffect } from 'react';
import { migrateDataStructureIfNeeded, syncAllFromDB } from './services/storageService';
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
import ViePersoPage from './pages/ViePersoPage';
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
    return localStorage.getItem('mynds_auth_token') === 'true' || localStorage.getItem('mynds_user') !== null;
  });
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const init = async () => {
        migrateDataStructureIfNeeded();
        if (isAuthenticated && localStorage.getItem('mynds_migrated_to_pg') === 'true') {
            setIsSyncing(true);
            await syncAllFromDB();
            setIsSyncing(false);
        }
        generatePendingSalaries();
    };
    init();

    // Rattrapage des factures Elkindy 2024 et 2025 v4 blindé
    try {
      const isSeededV4 = localStorage.getItem('elkindy_seeded_2024_2025_v4');
      if (!isSeededV4) {
        
        let actualClientId = 'CLI-KINDY-001';
        let actualClientName = 'Elkindy';

        // 1. Chercher dans les clients
        const clients = JSON.parse(localStorage.getItem('mynds_clients') || '[]');
        const elkindyTarget = clients.find(c => c.enseigne && (c.enseigne.toLowerCase().includes('kindy') || c.enseigne.toLowerCase().includes('kindi')));
        
        // 2. Chercher dans les factures existantes (plan B)
        let factures = JSON.parse(localStorage.getItem('mynds_factures') || '[]');
        if (elkindyTarget) {
            actualClientId = elkindyTarget.id;
            actualClientName = elkindyTarget.enseigne;
        } else {
            const sampleInvoice = factures.find(f => f.client && (f.client.toLowerCase().includes('kindy') || f.client.toLowerCase().includes('kindi')));
            if (sampleInvoice) {
                actualClientId = sampleInvoice.clientId;
                actualClientName = sampleInvoice.client;
            }
        }

        // AGGRESSIVE CLEANUP: Wipe ALL generated rattrapage invoices from previous buggy attempts (v1, v2, v3)
        factures = factures.filter(f => !(
            f.history && f.history[0]?.action && f.history[0].action.includes('Rattrapage Historique')
        ));

        const newFactures = [];
        
        for (let y of [2024, 2025]) {
            let startMonth = (y === 2024) ? 2 : 0; // Mars 2024 = index 2 (Mois n°3)
            for (let m = startMonth; m < 12; m++) {
                const mStr = String(m + 1).padStart(2, '0');
                const lastDay = new Date(y, m + 1, 0).getDate();
                const id = `ND-Kindy-${y}-${mStr}`; // ID déterministe pour éviter les doublons
                
                newFactures.push({
                    id: id,
                    client: actualClientName,
                    clientId: actualClientId,
                    dateEmi: `${y}-${mStr}-01`,
                    dateEcheance: `${y}-${mStr}-05`,
                    datePaiement: `${y}-${mStr}-05`,
                    periodeDebut: `${y}-${mStr}-01`,
                    periodeFin: `${y}-${mStr}-${lastDay}`,
                    statut: "Paid",
                    compteEncaissement: "QNB",
                    montant: "800.00",
                    totalHT: "800.00",
                    tva: 0,
                    totalTTC: "800.00",
                    history: [
                        {
                            date: new Date().toISOString(),
                            action: 'Rattrapage Historique v4',
                            details: 'Générée et marquée comme payée automatiquement pour matrice'
                        }
                    ],
                    lignes: [
                        {
                            desc: `Abonnement social media - ${(new Date(y, m)).toLocaleDateString('fr-FR', {month:'long'})} ${y}`,
                            basePrice: "800",
                            qte: 1,
                            tva: "0",
                            total: 800
                        }
                    ]
                });
            }
        }
        
        localStorage.setItem('mynds_factures', JSON.stringify([...newFactures, ...factures]));
        localStorage.setItem('elkindy_seeded_2024_2025_v4', 'true');
        window.location.reload();
      }
    } catch (e) {
      console.error("Erreur injection Elkindy v4:", e);
    }

  }, []);

  const handleLogin = () => {
    localStorage.setItem('mynds_auth_token', 'true');
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <LoginPage onLogin={handleLogin} />
      </ErrorBoundary>
    );
  }

  if (isSyncing) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,193,5,0.1)', borderTopColor: 'var(--accent-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px' }}></div>
        <div style={{ fontWeight: '800', fontSize: '18px', letterSpacing: '-0.5px' }}>Synchronisation avec PostgreSQL...</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>Récupération de vos données sécurisées</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
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
          <Route path="/vie-perso" element={<ViePersoPage />} />
          <Route path="/configuration" element={<ConfigPage />} />
        </Routes>
      </Layout>
    </Router>
    </ErrorBoundary>
  );
}

export default App;
