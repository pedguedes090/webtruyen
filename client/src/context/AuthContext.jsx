import { createContext, useState, useEffect, useContext } from 'react';
import { getMe, syncUserDataAPI } from '../api';

const AuthContext = createContext();

// Sync localStorage data to server on login
async function syncLocalDataToServer() {
    try {
        const localHistory = JSON.parse(localStorage.getItem('readingHistory') || '[]');
        const localFollows = JSON.parse(localStorage.getItem('following') || '[]');

        if (localHistory.length > 0 || localFollows.length > 0) {
            console.log('📤 Syncing local data to server...');
            const result = await syncUserDataAPI(localHistory, localFollows);

            // Update localStorage with merged data from server
            if (result.history && result.history.length > 0) {
                const mergedHistory = result.history.map(item => ({
                    comicId: item.comic_id,
                    comicSlug: item.slug,
                    comicTitle: item.title,
                    coverUrl: item.cover_url,
                    chapterNumber: item.chapter_number,
                    timestamp: new Date(item.read_at).getTime()
                }));
                localStorage.setItem('readingHistory', JSON.stringify(mergedHistory));
            }

            if (result.follows && result.follows.length > 0) {
                const mergedFollows = result.follows.map(item => ({
                    id: item.comic_id,
                    title: item.title,
                    cover_url: item.cover_url,
                    author: item.author,
                    slug: item.slug,
                    followedAt: new Date(item.followed_at).getTime()
                }));
                localStorage.setItem('following', JSON.stringify(mergedFollows));
            }

            console.log('✅ Sync completed!');
        }
    } catch (error) {
        console.error('Failed to sync data:', error);
        // Don't throw - sync failure shouldn't block login
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(() => localStorage.getItem('authToken'));

    useEffect(() => {
        async function loadUser() {
            if (token) {
                try {
                    const userData = await getMe();
                    setUser(userData);
                } catch (error) {
                    console.error('Failed to load user:', error);
                    // Token invalid, clear it
                    localStorage.removeItem('authToken');
                    setToken(null);
                }
            }
            setLoading(false);
        }
        loadUser();
    }, [token]);

    async function login(userData, authToken) {
        localStorage.setItem('authToken', authToken);
        setToken(authToken);
        setUser(userData);

        // Sync local data to server after login
        await syncLocalDataToServer();
    }

    function logout() {
        localStorage.removeItem('authToken');
        setToken(null);
        setUser(null);
    }

    function updateUser(userData) {
        setUser(userData);
    }

    const value = {
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        updateUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
