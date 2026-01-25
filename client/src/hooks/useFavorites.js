import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'favorites';

export function useFavorites() {
    const [favorites, setFavorites] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    }, [favorites]);

    const addFavorite = useCallback((comic) => {
        setFavorites(prev => {
            if (prev.some(f => f.id === comic.id)) return prev;
            return [...prev, {
                id: comic.id,
                title: comic.title,
                cover_url: comic.cover_url,
                author: comic.author,
                addedAt: Date.now()
            }];
        });
    }, []);

    const removeFavorite = useCallback((comicId) => {
        setFavorites(prev => prev.filter(f => f.id !== comicId));
    }, []);

    const isFavorite = useCallback((comicId) => {
        return favorites.some(f => f.id === comicId);
    }, [favorites]);

    const toggleFavorite = useCallback((comic) => {
        if (isFavorite(comic.id)) {
            removeFavorite(comic.id);
        } else {
            addFavorite(comic);
        }
    }, [isFavorite, removeFavorite, addFavorite]);

    return {
        favorites,
        addFavorite,
        removeFavorite,
        isFavorite,
        toggleFavorite
    };
}

export default useFavorites;
