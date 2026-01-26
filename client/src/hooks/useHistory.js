import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserHistory, addToHistoryAPI, removeFromHistoryAPI, clearHistoryAPI, slugify } from '../api';

const STORAGE_KEY = 'readingHistory';
const MAX_HISTORY = 50;

export function useHistory() {
    const { isAuthenticated } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load history from API or localStorage
    useEffect(() => {
        async function loadHistory() {
            setLoading(true);
            try {
                if (isAuthenticated) {
                    // Load from API
                    const response = await getUserHistory(MAX_HISTORY);
                    // Transform API data to match localStorage format
                    const apiHistory = response.data.map(item => ({
                        comicId: item.comic_id,
                        comicSlug: item.slug,
                        comicTitle: item.title,
                        coverUrl: item.cover_url,
                        chapterNumber: item.chapter_number,
                        timestamp: new Date(item.read_at).getTime()
                    }));
                    setHistory(apiHistory);
                } else {
                    // Load from localStorage
                    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
                    setHistory(saved);
                }
            } catch (error) {
                console.error('Error loading history:', error);
                // Fallback to localStorage
                const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
                setHistory(saved);
            } finally {
                setLoading(false);
            }
        }
        loadHistory();
    }, [isAuthenticated]);

    // Add to history
    const addToHistory = useCallback(async (comic, chapter) => {
        const entry = {
            comicId: comic.id,
            comicSlug: comic.slug || slugify(comic.title),
            comicTitle: comic.title,
            coverUrl: comic.cover_url,
            chapterId: chapter.id,
            chapterNumber: chapter.chapter_number,
            timestamp: Date.now()
        };

        // Always update localStorage for offline support
        const localHistory = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const existingIndex = localHistory.findIndex(h => h.comicId === comic.id);
        if (existingIndex !== -1) {
            localHistory.splice(existingIndex, 1);
        }
        localHistory.unshift(entry);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localHistory.slice(0, MAX_HISTORY)));

        // Update state
        setHistory(prev => {
            const updated = prev.filter(h => h.comicId !== comic.id);
            return [entry, ...updated].slice(0, MAX_HISTORY);
        });

        // If authenticated, also save to API
        if (isAuthenticated) {
            try {
                await addToHistoryAPI(comic.id, chapter.chapter_number);
            } catch (error) {
                console.error('Error saving history to API:', error);
            }
        }
    }, [isAuthenticated]);

    // Remove from history
    const removeFromHistory = useCallback(async (comicId) => {
        // Update localStorage
        const localHistory = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const updated = localHistory.filter(h => h.comicId !== comicId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        // Update state
        setHistory(prev => prev.filter(h => h.comicId !== comicId));

        // If authenticated, also remove from API
        if (isAuthenticated) {
            try {
                await removeFromHistoryAPI(comicId);
            } catch (error) {
                console.error('Error removing history from API:', error);
            }
        }
    }, [isAuthenticated]);

    // Clear all history
    const clearHistory = useCallback(async () => {
        // Clear localStorage
        localStorage.removeItem(STORAGE_KEY);

        // Clear state
        setHistory([]);

        // If authenticated, also clear from API
        if (isAuthenticated) {
            try {
                await clearHistoryAPI();
            } catch (error) {
                console.error('Error clearing history from API:', error);
            }
        }
    }, [isAuthenticated]);

    return {
        history,
        loading,
        addToHistory,
        removeFromHistory,
        clearHistory
    };
}

export default useHistory;
