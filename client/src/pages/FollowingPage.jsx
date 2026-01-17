import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ComicCard } from '../components/ComicCard';
import { getComic } from '../api';
import { useFollow } from '../hooks/useFollow';
import { PushpinFilled } from '@ant-design/icons';

function FollowingPage() {
    const { following, unfollow } = useFollow();
    const [comics, setComics] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadComics() {
            if (following.length === 0) {
                setLoading(false);
                return;
            }

            try {
                const comicsData = await Promise.all(
                    following.map(async (item) => {
                        try {
                            return await getComic(item.id);
                        } catch {
                            return item; // Use cached data if API fails
                        }
                    })
                );
                setComics(comicsData);
            } catch (error) {
                console.error('Error loading following:', error);
            } finally {
                setLoading(false);
            }
        }
        loadComics();
    }, [following]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-10 h-10 border-4 border-gray-200 dark:border-dark-tertiary border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <main className="max-w-7xl mx-auto px-4 py-6">
            <div className="bg-white dark:bg-dark-card p-4 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-2 mb-4">
                    <PushpinFilled className="text-blue-500 text-lg" />
                    <h1 className="text-lg font-semibold text-primary">Truyện đang theo dõi</h1>
                    <span className="text-xs text-gray-500">({following.length} truyện)</span>
                </div>

                {following.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-gray-400 mb-2">Chưa theo dõi truyện nào</p>
                        <Link to="/" className="text-sm text-primary hover:underline">
                            Khám phá truyện mới →
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                        {comics.map((comic) => (
                            <div key={comic.id} className="relative group">
                                <ComicCard comic={comic} showBadge />
                                <button
                                    onClick={() => unfollow(comic.id)}
                                    className="absolute top-1 right-1 w-6 h-6 bg-gray-700/90 text-white text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Bỏ theo dõi"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

export default FollowingPage;
