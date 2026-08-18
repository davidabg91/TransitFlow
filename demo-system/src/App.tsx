import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import ClientProfile from './pages/ClientProfile';
import LoginPage from './pages/LoginPage';
import TransitView from './components/TransitView';
import CardScanSimulator from './components/CardScanSimulator';

import SystemAdminPanel from './pages/SystemAdminPanel';
const DemoHub = lazy(() => import('./pages/DemoHub'));
const Landing = lazy(() => import('./pages/Landing'));
const Inspections = lazy(() => import('./pages/Inspections'));
const StaffPortal = lazy(() => import('./pages/StaffPortal'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Help = lazy(() => import('./pages/Help'));
const Signal = lazy(() => import('./pages/Signal'));
const BusRental = lazy(() => import('./pages/BusRental'));
const Legal = lazy(() => import('./pages/Legal'));

const PageLoader = () => <LoadingScreen />;

/**
 * Turns a card tap into an open TransitView, exactly as the production app does
 * when the myPOS terminal's NFC reader fires. In the demo the tap comes from the
 * on-screen card simulator, which dispatches the same `dary-nfc-scan` event.
 */
function ScanHandler() {
    const navigate = useNavigate();
    const [transitId, setTransitId] = useState<string | null>(null);
    const [physicalUid, setPhysicalUid] = useState<string | undefined>(undefined);
    const [nfcCounter, setNfcCounter] = useState<number | undefined>(undefined);
    // Bumped on every scan so TransitView remounts even when the SAME card is
    // scanned twice in a row — required for anti-passback to fire on a re-scan.
    const [scanNonce, setScanNonce] = useState(0);
    const lastTriggerRef = useRef<{ id: string; t: number }>({ id: '', t: 0 });

    const triggerScan = useCallback((finalId: string, uid?: string, counter?: number) => {
        if (!finalId) return;
        const now = Date.now();
        // Ignore duplicate events from the same physical tap (some readers fire twice).
        if (lastTriggerRef.current.id === finalId && now - lastTriggerRef.current.t < 1200) return;
        lastTriggerRef.current = { id: finalId, t: now };
        setTransitId(finalId);
        setPhysicalUid(uid);
        setNfcCounter(counter);
        setScanNonce(n => n + 1);
    }, []);

    useEffect(() => {
        const handler = (e: Event) => {
            const { id, url, nfcCounter: counter, physicalUid: uid } =
                (e as CustomEvent<{ id: string; url?: string; nfcCounter?: number; physicalUid?: string }>).detail || {} as any;
            let idFromUrl: string | null = null;
            if (url && url.includes('client/')) {
                const match = url.match(/\/client\/([^/?#]+)/);
                if (match) idFromUrl = match[1].toUpperCase();
            }
            triggerScan(idFromUrl || id || '', uid ?? (id ? String(id).toUpperCase() : undefined), counter);
        };
        window.addEventListener('dary-nfc-scan', handler);
        return () => window.removeEventListener('dary-nfc-scan', handler);
    }, [triggerScan]);

    const handleClose = useCallback(() => setTransitId(null), []);
    const handleUnregistered = useCallback((id: string) => {
        setTransitId(null);
        navigate(`/client/${id}`);
    }, [navigate]);

    return (
        <div id="transit-id-setter">
            {transitId && (
                <TransitView
                    key={scanNonce}
                    id={transitId}
                    physicalUid={physicalUid}
                    nfcCounter={nfcCounter}
                    onClose={handleClose}
                    onUnregistered={handleUnregistered}
                />
            )}
        </div>
    );
}

function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <HashRouter>
        <ScanHandler />
        <CardScanSimulator />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public — no login needed */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/client/:id" element={<Layout />}>
              <Route index element={<ClientProfile />} />
            </Route>

            {/* App shell */}
            <Route path="/" element={<Layout />}>
              <Route index element={<DemoHub />} />
              <Route path="schedules" element={<Landing />} />
              <Route path="signal" element={<Signal />} />
              <Route path="rent" element={<BusRental />} />
              <Route path="portal" element={<StaffPortal />} />

              {/* Moderator + Admin */}
              <Route path="admin" element={
                <ProtectedRoute allowedRoles={['admin', 'moderator']}><AdminPanel /></ProtectedRoute>
              } />

              {/* Inspectors + Admin */}
              <Route path="inspections" element={
                <ProtectedRoute allowedRoles={['admin', 'inspector']}><Inspections /></ProtectedRoute>
              } />

              {/* Admin only */}
              <Route path="system-admin" element={
                <ProtectedRoute requiredRole="admin"><SystemAdminPanel /></ProtectedRoute>
              } />

              <Route path="help" element={
                <ProtectedRoute><Help /></ProtectedRoute>
              } />

              <Route path="legal" element={<Legal />} />
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
