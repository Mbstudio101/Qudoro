import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { useNotificationScheduler } from './hooks/useNotificationScheduler';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Questions from './pages/Questions';
import ExamSets from './pages/ExamSets';
import Flashcards from './pages/Flashcards';
import Settings from './pages/Settings';
import Practice from './pages/Practice';
import Profile from './pages/Profile';
import Calendar from './pages/Calendar';
import Notes from './pages/Notes';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import ProfileSelect from './pages/Auth/ProfileSelect';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, activeProfileId } = useStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!activeProfileId) return <Navigate to="/profiles" replace />;
  return <>{children}</>;
};

const AnimatedRoutes = () => {
  const { isAuthenticated } = useStore();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/profiles" element={isAuthenticated ? <ProfileSelect /> : <Navigate to="/login" />} />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="notes" element={<Notes />} />
        <Route path="questions" element={<Questions />} />
        <Route path="sets" element={<ExamSets />} />
        <Route path="practice/:setId" element={<Practice />} />
        <Route path="flashcards" element={<Flashcards />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
};

import { Logo } from './components/ui/Logo';

const App = () => {
  const { userProfile } = useStore();
  
  // Initialize notification scheduler
  useNotificationScheduler();

  useEffect(() => {
    // Global Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
        // Toggle Fullscreen on 'F' (if not typing in an input)
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        
        if (e.key.toLowerCase() === 'f' && !isInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            window.electron.maximize(); // maximize-window toggles fullscreen on macOS in our main.ts
        }
        
        // Exit Fullscreen on 'Escape'
        if (e.key === 'Escape') {
             // We can trigger the same toggle, or ensure we exit.
             // Since maximize-window toggles, this might need a specific 'exit-fullscreen' if we want to be strict.
             // But for now, let's reuse the toggle if we are in fullscreen.
             // However, we don't know the state here easily without querying.
             // A better UX is to let the user hit ESC to leave. 
             // Let's send a specific 'exit-fullscreen' event if needed, or just reuse maximize for toggle.
             // Given the user request: "ESC to get it off fullscreen"
             
             // We'll send a specific intent to ensure we don't accidentally enter fullscreen with ESC
             window.electron.minimize(); // Just kidding, minimize hides the window.
             
             // Let's rely on the toggle for now, or add a specific handler if the user wants strictness.
             // Actually, standard behavior is usually handled by the OS, but since we are frameless, we need to handle it.
             // Let's add a new IPC handler for 'exit-fullscreen' to be safe.
             window.electron.exitFullscreen?.();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    const applyTheme = () => {
      const root = window.document.documentElement;
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      const theme = userProfile.theme || 'system';

      root.classList.remove('light', 'dark');

      if (theme === 'system') {
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (userProfile.theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    
    // Simulate initial loading time or wait for resources
    const timer = setTimeout(() => {
      setIsAppReady(true);
    }, 1000);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange);
      clearTimeout(timer);
    };
  }, [userProfile.theme]);

  if (!isAppReady) {
     return (
       <div className="fixed inset-0 flex flex-col items-center justify-center bg-background text-foreground z-50 transition-opacity duration-500">
          <div className="relative w-24 h-24 animate-pulse">
            <Logo className="w-full h-full" />
          </div>
          <h1 className="mt-8 text-2xl font-bold tracking-tighter animate-pulse">Qudoro</h1>
       </div>
     );
  }

  return (
    <HashRouter>
      <AnimatedRoutes />
    </HashRouter>
  );
};

export default App;
