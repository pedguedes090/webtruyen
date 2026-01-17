import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ComicCard } from '../components/ComicCard';
import { getComic } from '../api';
import { useFavorites } from '../hooks/useFavorites';
import { HeartFilled } from '@ant-design/icons';

function FavoritesPage() {
    const { favorites, removeFavorite } = useFavorites();
    const [comics, setComics] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadComics() {
            if (favorites.length === 0) {
                setLoading(false);
                return;
            }

            try {
                const comicsData = await Promise.all(
                    favorites.map(async (fav) => {
                        try {
                            return await getComic(fav.id);
                        } catch {
                            return fav; // Use cached data if API fails
                        }
                    })
                );
                setComics(comicsData);
            } catch (error) {
                console.error('Error loading favorites:', error);
            } finally {
                setLoading(false);
            }
        }
        loadComics();
    }, [favorites]);

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
                    <HeartFilled className="text-red-500 text-lg" />
                    <h1 className="text-lg font-semibold text-primary">Truyện yêu thích</h1>
                    <span className="text-xs text-gray-500">({favorites.length} truyện)</span>
                </div>

                {favorites.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-gray-400 mb-2">Chưa có truyện yêu thích</p>
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
                                    onClick={() => removeFavorite(comic.id)}
                                    className="absolute top-1 right-1 w-6 h-6 bg-red-500/90 text-white text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Xóa khỏi yêu thích"
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

export default FavoritesPage;
