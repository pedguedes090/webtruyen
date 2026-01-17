import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'following';

export function useFollow() {
    const [following, setFollowing] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(following));
    }, [following]);

    const follow = useCallback((comic) => {
        setFollowing(prev => {
            if (prev.some(f => f.id === comic.id)) return prev;
            return [...prev, {
                id: comic.id,
                title: comic.title,
                cover_url: comic.cover_url,
                author: comic.author,
                followedAt: Date.now()
            }];
        });
    }, []);

    const unfollow = useCallback((comicId) => {
        setFollowing(prev => prev.filter(f => f.id !== comicId));
    }, []);

    const isFollowing = useCallback((comicId) => {
        return following.some(f => f.id === comicId);
    }, [following]);

    const toggleFollow = useCallback((comic) => {
        if (isFollowing(comic.id)) {
            unfollow(comic.id);
        } else {
            follow(comic);
        }
    }, [isFollowing, unfollow, follow]);

    return {
        following,
        follow,
        unfollow,
        isFollowing,
        toggleFollow
    };
}

export default useFollow;
