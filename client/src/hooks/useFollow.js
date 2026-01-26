import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserFollows, followComicAPI, unfollowComicAPI } from '../api';

const STORAGE_KEY = 'following';

export function useFollow() {
    const { isAuthenticated } = useAuth();
    const [following, setFollowing] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load follows from API or localStorage
    useEffect(() => {
        async function loadFollows() {
            setLoading(true);
            try {
                if (isAuthenticated) {
                    // Load from API
                    const response = await getUserFollows();
                    // Transform API data to match localStorage format
                    const apiFollows = response.data.map(item => ({
                        id: item.comic_id,
                        title: item.title,
                        cover_url: item.cover_url,
                        author: item.author,
                        slug: item.slug,
                        followedAt: new Date(item.followed_at).getTime()
                    }));
                    setFollowing(apiFollows);
                } else {
                    // Load from localStorage
                    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
                    setFollowing(saved);
                }
            } catch (error) {
                console.error('Error loading follows:', error);
                // Fallback to localStorage
                const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
                setFollowing(saved);
            } finally {
                setLoading(false);
            }
        }
        loadFollows();
    }, [isAuthenticated]);

    // Follow a comic
    const follow = useCallback(async (comic) => {
        const entry = {
            id: comic.id,
            title: comic.title,
            cover_url: comic.cover_url,
            author: comic.author,
            slug: comic.slug,
            followedAt: Date.now()
        };

        // Check if already following
        if (following.some(f => f.id === comic.id)) {
            return;
        }

        // Update localStorage for offline support
        const localFollows = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        if (!localFollows.some(f => f.id === comic.id)) {
            localFollows.push(entry);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(localFollows));
        }

        // Update state
        setFollowing(prev => [...prev, entry]);

        // If authenticated, also save to API
        if (isAuthenticated) {
            try {
                await followComicAPI(comic.id);
            } catch (error) {
                console.error('Error following comic via API:', error);
            }
        }
    }, [isAuthenticated, following]);

    // Unfollow a comic
    const unfollow = useCallback(async (comicId) => {
        // Update localStorage
        const localFollows = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const updated = localFollows.filter(f => f.id !== comicId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        // Update state
        setFollowing(prev => prev.filter(f => f.id !== comicId));

        // If authenticated, also remove from API
        if (isAuthenticated) {
            try {
                await unfollowComicAPI(comicId);
            } catch (error) {
                console.error('Error unfollowing comic via API:', error);
            }
        }
    }, [isAuthenticated]);

    // Check if following
    const isFollowing = useCallback((comicId) => {
        return following.some(f => f.id === comicId);
    }, [following]);

    // Toggle follow
    const toggleFollow = useCallback((comic) => {
        if (isFollowing(comic.id)) {
            unfollow(comic.id);
        } else {
            follow(comic);
        }
    }, [isFollowing, unfollow, follow]);

    return {
        following,
        loading,
        follow,
        unfollow,
        isFollowing,
        toggleFollow
    };
}

export default useFollow;
