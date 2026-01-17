import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect, createContext, Suspense, lazy } from 'react';
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
            {!isReaderPage && <Header />}
            <Suspense fallback={<PageLoader />}>
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
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/genres" element={<GenresPage />} />
                    <Route path="/favorites" element={<FavoritesPage />} />
                    <Route path="/following" element={<FollowingPage />} />
                </Routes>
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

    // Block right-click on entire website
    useEffect(() => {
        const handleContextMenu = (e) => {
            e.preventDefault();
            return false;
        };
        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, []);

    function toggleTheme() {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            <AuthProvider>
                <BrowserRouter>
                    <AppContent />
                </BrowserRouter>
            </AuthProvider>
        </ThemeContext.Provider>
    );
}

export default App;
