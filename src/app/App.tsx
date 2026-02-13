/**
 * App.tsx — Root Application Shell
 * Microsoft Enterprise Architecture version
 * 
 * CRITICAL FIX: Moved ALL component definitions outside App() to prevent re-creation
 * on every render, which was causing infinite mount/unmount cycles downstream
 */

import { useEffect, lazy, Suspense, type FC, type ReactNode } from 'react';
import '../icons/fa';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { FluentProvider, webDarkTheme, Spinner, type Theme } from '@fluentui/react-components';

import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

// Lazy-loaded route components for code splitting
const ThemeSwitcher = lazy(() => import('../components/ThemeSwitcher').then(m => ({ default: m.ThemeSwitcher })));
const NotesView = lazy(() => import('../components/trading/NotesView').then(m => ({ default: m.NotesView })));
const TestTradingRoomShell = lazy(() => import('../components/trading/TestTradingRoomShell').then(m => ({ default: m.TestTradingRoomShell })));
const ToastContainer = lazy(() => import('../components/ToastContainer').then(m => ({ default: m.ToastContainer })));
const EnhancedAuthPage = lazy(() => import('../components/icons/EnhancedAuthPage').then(m => ({ default: m.EnhancedAuthPage })));
const ImageModal = lazy(() => import('../components/modals/ImageModal').then(m => ({ default: m.ImageModal })));
const RoomSelector = lazy(() => import('../components/rooms/RoomSelector').then(m => ({ default: m.RoomSelector })));
const TradingRoomWrapper = lazy(() => import('../components/trading/TradingRoomWrapper').then(m => ({ default: m.TradingRoomWrapper })));

const PageSpinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#111827' }}>
    <Spinner label="Loading..." />
  </div>
);

// 🔥 CRITICAL: Hoist ProtectedRoute outside to prevent recreation
interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, initialized } = useAuthStore();

  if (!initialized) {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    // Fast-path: allow test whiteboard route to render immediately without auth/session
    if (path.startsWith('/__test_whiteboard')) {
      return (
        <FluentProvider theme={webDarkTheme} dir="ltr">
          <TestWhiteboard />
        </FluentProvider>
      );
    }
    return (
      <FluentProvider theme={webDarkTheme} dir="ltr">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: '#111827',
          }}
        >
          <Spinner label="Loading Trading Platform..." />
        </div>
      </FluentProvider>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Test-session injector for E2E routes (bypasses real auth for deterministic tests)
const InjectTestSession: FC<{ children: ReactNode }> = ({ children }) => {
  const { initialized, isAuthenticated } = useAuthStore();
  useEffect(() => {
    if (initialized && !isAuthenticated) {
      // Inject fake session for E2E tests
      useAuthStore.getState().setSession({
        user: {
          id: 'test-user',
          email: 'test@example.com',
          display_name: 'Test User',
          avatar_url: undefined,
          role: 'admin',
          tokens: undefined,
          created_at: new Date().toISOString(),
        },
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
      });
    }
  }, [initialized, isAuthenticated]);
  return <>{children}</>;
};

// Test Trading Room route wrapper (grabs param and renders room wrapper)
const TestTradingRoom: FC = () => {
  return (
    <InjectTestSession>
      <TestTradingRoomShell />
    </InjectTestSession>
  );
};

const TestWhiteboardHarness = lazy(() => import('../components/testing/TestWhiteboardHarness').then(m => ({ default: m.TestWhiteboardHarness })));

// Test Whiteboard route wrapper (always active overlay + toolbar)
const TestWhiteboard: FC = () => (
  <InjectTestSession>
    <TestWhiteboardHarness />
  </InjectTestSession>
);

// 🔥 CRITICAL: AppRoutes component outside App() to prevent re-creation
const AppRoutes: FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { currentTheme } = useThemeStore();
  const navigate = useNavigate();

  return (
    <FluentProvider theme={(currentTheme as Partial<Theme>) || webDarkTheme} dir="ltr">
      <Suspense fallback={<PageSpinner />}>
      <Routes>
        {/* Public routes - session-based check */}
        <Route 
          path="/auth" 
          element={!isAuthenticated ? <EnhancedAuthPage /> : <Navigate to="/" replace />} 
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RoomSelector onSelectRoom={(room) => navigate(`/room/${room.id}`)} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/room/:roomId"
          element={
            <ProtectedRoute>
              <TradingRoomWrapper />
            </ProtectedRoute>
          }
        />

        {/* Test-only NotesView route (now always included for E2E reliability) */}
        <Route
          path="/__test_notes"
          element={
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
              <NotesView
                roomId="test-room"
                roomName="Test Room"
                isAdmin={true}
                autoInit={true}
              />
            </div>
          }
        />
        {/* Test-only Trading Room route (bypasses ProtectedRoute) */}
        <Route path="/__test_trading/:roomId" element={<TestTradingRoom />} />
        {/* Test-only Whiteboard route */}
        <Route path="/__test_whiteboard" element={<TestWhiteboard />} />
        {/* Default fallback - session-based check */}
        <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/auth'} replace />} />
      </Routes>
      </Suspense>

      {/* Global toast notifications */}
      <Suspense fallback={null}><ToastContainer /></Suspense>

      {/* Global image modal */}
      <Suspense fallback={null}><ImageModal /></Suspense>

      {/* Theme switcher - only show when logged in */}
      {isAuthenticated && <Suspense fallback={null}><ThemeSwitcher /></Suspense>}
    </FluentProvider>
  );
};

export function App() {
  const { initialized, initialize } = useAuthStore();

  // Microsoft pattern: Initialize auth on app load
  useEffect(() => {
    initialize();
  }, []);

  // Microsoft Pattern: Don't verify session here - authStore.initialize() is the single source of truth
  // Removed redundant DEBUG auth verification to prevent race conditions

  // Loading state - wait for auth initialization
  if (!initialized) {
    return (
      <FluentProvider theme={webDarkTheme} dir="ltr">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: '#111827',
          }}
        >
          <Spinner label="Loading Trading Platform..." />
        </div>
      </FluentProvider>
    );
  }

  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
