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
import Discover from './pages/Discover';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import ProfileSelect from './pages/Auth/ProfileSelect';
import { Logo } from './components/ui/Logo';
import ErrorBoundary from './components/ErrorBoundary';
import { getSupabaseClient } from './services/marketplace/supabaseClient';

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
        <Route path="discover" element={<Discover />} />
        <Route path="sets" element={<ExamSets />} />
        <Route path="practice/:setId" element={<Practice />} />
        <Route path="flashcards" element={<Flashcards />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
};

const App = () => {
  const { userProfile, isAuthenticated, authenticateWithSupabase } = useStore();
  
  // Initialize notification scheduler
  useNotificationScheduler();

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || isAuthenticated) return;

    void supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user?.email) return;
      const name =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined);
      const field = (user.user_metadata?.field as string | undefined) || undefined;
      const country = (user.user_metadata?.country as string | undefined) || undefined;
      authenticateWithSupabase({
        email: user.email,
        name,
        field,
        country,
      });
    });
  }, [authenticateWithSupabase, isAuthenticated]);

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
        
        // Exit fullscreen on Escape.
        if (e.key === 'Escape') {
             e.preventDefault();
             window.electron.exitFullscreen();
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
    }, 200);

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
      <ErrorBoundary>
        <AnimatedRoutes />
      </ErrorBoundary>
    </HashRouter>
  );
};

export default App;
