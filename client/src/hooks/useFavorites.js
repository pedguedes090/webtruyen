import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFavorites as getFavoritesApi, addFavorite as addFavoriteApi, removeFavorite as removeFavoriteApi, checkFavorite as checkFavoriteApi } from '../api/user';

const STORAGE_KEY = 'favorites';

export function useFavorites() {
    const { user } = useAuth();
    const [favorites, setFavorites] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });
    const [loading, setLoading] = useState(false);

    // Sync from API if user logs in
    useEffect(() => {
        if (user) {
            setLoading(true);
            getFavoritesApi(100) // Get all favorites
                .then(data => {
                    setFavorites(data.map(f => ({
                        id: f.id,
                        title: f.title,
                        cover_url: f.cover_url,
                        author: f.author,
                        addedAt: f.favorited_at
                    })));
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        } else {
            // Load from local storage for guest
            const saved = localStorage.getItem(STORAGE_KEY);
            setFavorites(saved ? JSON.parse(saved) : []);
        }
    }, [user]);

    // Save to local storage only if guest
    useEffect(() => {
        if (!user) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
        }
    }, [favorites, user]);

    const addFavorite = useCallback(async (comic) => {
        // Optimistic update
        const newFav = {
            id: comic.id,
            title: comic.title,
            cover_url: comic.cover_url,
            author: comic.author,
            addedAt: Date.now()
        };

        setFavorites(prev => {
            if (prev.some(f => f.id === comic.id)) return prev;
            return [newFav, ...prev];
        });

        if (user) {
            try {
                await addFavoriteApi(comic.id);
            } catch (error) {
                // Revert on error
                console.error('Failed to add favorite to server', error);
                setFavorites(prev => prev.filter(f => f.id !== comic.id));
            }
        }
    }, [user]);

    const removeFavorite = useCallback(async (comicId) => {
        // Optimistic update
        const prevFavorites = [...favorites];
        setFavorites(prev => prev.filter(f => f.id !== comicId));

        if (user) {
            try {
                await removeFavoriteApi(comicId);
            } catch (error) {
                // Revert on error
                console.error('Failed to remove favorite from server', error);
                setFavorites(prevFavorites);
            }
        }
    }, [user, favorites]);

    const isFavorite = useCallback((comicId) => {
        return favorites.some(f => f.id === comicId);
    }, [favorites]);

    const toggleFavorite = useCallback((comic) => {
        // Simple debounce could be added here or in UI
        if (isFavorite(comic.id)) {
            removeFavorite(comic.id);
        } else {
            addFavorite(comic);
        }
    }, [isFavorite, removeFavorite, addFavorite]);

    return {
        favorites,
        loading,
        addFavorite,
        removeFavorite,
        isFavorite,
        toggleFavorite
    };
}

export default useFavorites;
