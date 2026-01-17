import { createContext, useState, useEffect, useContext } from 'react';
import { getMe } from '../api';

const AuthContext = createContext();

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

    function login(userData, authToken) {
        localStorage.setItem('authToken', authToken);
        setToken(authToken);
        setUser(userData);
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
