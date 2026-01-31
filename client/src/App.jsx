import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect, createContext, Suspense, lazy } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';

// Eager load critical pages
import HomePage from './pages/HomePage';

// Lazy load other pages for code splitting
const ComicPage = lazy(() => import('./pages/ComicPage'));
const ReaderPage = lazy(() => import('./pages/ReaderPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const GroupDashboard = lazy(() => import('./pages/GroupDashboard'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const GenresPage = lazy(() => import('./pages/GenresPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const FollowingPage = lazy(() => import('./pages/FollowingPage'));

export const ThemeContext = createContext();

// Loading fallback component
function PageLoader() {
    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="w-8 h-8 border-3 border-gray-200 dark:border-dark-tertiary border-t-primary rounded-full animate-spin" />
        </div>
    );
}

function AppContent() {
    const location = useLocation();
    const isReaderPage = location.pathname.match(/^\/truyen\/[^\/]+\/chuong\//);

    return (
        <div className="min-h-screen">
            {/* Skip to main content for screen readers */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:outline-none"
            >
                Bỏ qua đến nội dung chính
            </a>
            {!isReaderPage && <Header />}
            <Suspense fallback={<PageLoader />}>
                <main id="main-content">
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/truyen/:slug" element={<ComicPage />} />
                        <Route path="/truyen/:slug/chuong/:number" element={<ReaderPage />} />
                        {/* Legacy routes - redirect to new format */}
                        <Route path="/comic/:id" element={<ComicPage />} />
                        <Route path="/read/:id" element={<ReaderPage />} />
                        <Route path="/search" element={<SearchPage />} />
                        <Route path="/history" element={<HistoryPage />} />
                        <Route path="/adminaddct" element={<AdminPage />} />
                        <Route path="/group/dashboard" element={<GroupDashboard />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/genres" element={<GenresPage />} />
                        <Route path="/favorites" element={<FavoritesPage />} />
                        <Route path="/following" element={<FollowingPage />} />
                    </Routes>
                </main>
            </Suspense>
        </div>
    );
}

function App() {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved || 'dark';
    });

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    function toggleTheme() {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }

    return (
        <HelmetProvider>
            <ThemeContext.Provider value={{ theme, toggleTheme }}>
                <AuthProvider>
                    <BrowserRouter>
                        <AppContent />
                    </BrowserRouter>
                </AuthProvider>
            </ThemeContext.Provider>
        </HelmetProvider>
    );
}

export default App;
