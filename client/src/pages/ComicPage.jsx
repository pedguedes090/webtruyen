import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getComic, getComicBySlug, getChapters, resolveImageUrl, slugify } from '../api';
import { useFavorites } from '../hooks/useFavorites';
import { useFollow } from '../hooks/useFollow';
import { HeartOutlined, HeartFilled, PushpinOutlined, PushpinFilled } from '@ant-design/icons';
import { PLACEHOLDER_COVER } from '../constants/placeholders';

function ComicPage() {
    const { id, slug } = useParams();
    const [comic, setComic] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortDesc, setSortDesc] = useState(true);

    const { isFavorite, toggleFavorite } = useFavorites();
    const { isFollowing, toggleFollow } = useFollow();

    useEffect(() => {
        const fetchData = async () => {
            try {
                let comicData;
                if (slug) {
                    // New SEO-friendly URL
                    comicData = await getComicBySlug(slug);
                } else {
                    // Legacy URL with ID
                    comicData = await getComic(id);
                }
                const chaptersData = await getChapters(comicData.id);
                setComic(comicData);
                setChapters(chaptersData);
            } catch (error) {
                console.error('Error fetching comic:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, slug]);

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    }

    function formatViews(views) {
        if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
        if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
        return views?.toString() || '0';
    }

    const sortedChapters = sortDesc
        ? [...chapters].sort((a, b) => b.chapter_number - a.chapter_number)
        : [...chapters].sort((a, b) => a.chapter_number - b.chapter_number);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-10 h-10 border-4 border-gray-200 dark:border-dark-tertiary border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (!comic) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-10 text-center">
                <h2 className="text-xl font-semibold mb-4">Không tìm thấy truyện</h2>
                <Link to="/" className="btn btn-primary">Về trang chủ</Link>
            </div>
        );
    }

    return (
        <motion.main
            className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Comic Info */}
            <div className="bg-white dark:bg-dark-card p-3 sm:p-4 mb-4 shadow-sm dark:shadow-none rounded-lg">
                <div className="flex flex-col md:flex-row gap-4 sm:gap-5">
                    {/* Cover */}
                    <div className="flex-shrink-0 mx-auto md:mx-0">
                        <img
                            src={resolveImageUrl(comic.cover_url) || PLACEHOLDER_COVER}
                            alt={comic.title}
                            className="w-36 sm:w-48 h-48 sm:h-64 object-cover rounded-lg"
                        />
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">{comic.title}</h1>

                        <div className="space-y-2 text-sm mb-4">
                            <p className="text-gray-600 dark:text-gray-400">
                                <span className="text-gray-500">Tác giả:</span> {comic.author || 'Đang cập nhật'}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400">
                                <span className="text-gray-500">Tình trạng:</span>
                                <span className={comic.status === 'ongoing' ? 'text-green-400 ml-1' : 'text-blue-400 ml-1'}>
                                    {comic.status === 'ongoing' ? 'Đang tiến hành' : 'Hoàn thành'}
                                </span>
                            </p>
                            <p className="text-gray-600 dark:text-gray-400">
                                <span className="text-gray-500">Lượt xem:</span> {formatViews(comic.views)}
                            </p>
                        </div>

                        {/* Genres */}
                        {comic.genres && comic.genres.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                                {comic.genres.map((genre, index) => (
                                    <span key={index} className="px-2 py-0.5 bg-gray-200 dark:bg-dark-tertiary text-xs text-gray-700 dark:text-gray-300">
                                        {genre}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2">
                            {chapters.length > 0 && comic && (
                                <>
                                    <Link
                                        to={`/truyen/${comic.slug || slugify(comic.title)}/chuong/${chapters[0].chapter_number}`}
                                        className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
                                    >
                                        Đọc từ đầu
                                    </Link>
                                    <Link
                                        to={`/truyen/${comic.slug || slugify(comic.title)}/chuong/${chapters[chapters.length - 1].chapter_number}`}
                                        className="px-4 py-2 bg-gray-200 dark:bg-dark-tertiary text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-300 dark:hover:bg-dark-secondary transition-colors"
                                    >
                                        Đọc mới nhất
                                    </Link>
                                </>
                            )}

                            {comic && (
                                <>
                                    <button
                                        onClick={() => toggleFavorite(comic)}
                                        className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${isFavorite(comic.id)
                                            ? 'bg-red-500 text-white hover:bg-red-600'
                                            : 'bg-gray-200 dark:bg-dark-tertiary text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-dark-secondary'
                                            }`}
                                    >
                                        {isFavorite(comic.id) ? <HeartFilled /> : <HeartOutlined />} Yêu thích
                                    </button>
                                    <button
                                        onClick={() => toggleFollow(comic)}
                                        className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${isFollowing(comic.id)
                                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                                            : 'bg-gray-200 dark:bg-dark-tertiary text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-dark-secondary'
                                            }`}
                                    >
                                        {isFollowing(comic.id) ? <PushpinFilled /> : <PushpinOutlined />} Theo dõi
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
                    <h3 className="text-sm font-semibold text-primary mb-2">Nội dung</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {comic.description || 'Chưa có mô tả cho truyện này.'}
                    </p>
                </div>
            </div>

            {/* Chapter List */}
            <div className="bg-white dark:bg-dark-card p-4 shadow-sm dark:shadow-none">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-primary">
                        Danh sách chương ({chapters.length})
                    </h2>
                    <button
                        onClick={() => setSortDesc(!sortDesc)}
                        className="px-2 py-1 text-xs bg-gray-200 dark:bg-dark-tertiary text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-white transition-colors"
                    >
                        {sortDesc ? '↓ Mới nhất' : '↑ Cũ nhất'}
                    </button>
                </div>

                {chapters.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4">Chưa có chương nào.</p>
                ) : (
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 max-h-[400px] overflow-y-auto">
                        {sortedChapters.map(chapter => (
                            <Link
                                key={chapter.id}
                                to={`/truyen/${comic?.slug || slugify(comic?.title || '')}/chuong/${chapter.chapter_number}`}
                                className="flex items-center justify-between px-2 py-1.5 text-xs bg-gray-100 dark:bg-dark-secondary text-gray-700 dark:text-gray-300 hover:bg-primary hover:text-white transition-colors"
                            >
                                <span className="truncate">Chương {chapter.chapter_number}</span>
                                <span className="text-gray-500 ml-2">{formatDate(chapter.created_at)}</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </motion.main>
    );
}

export default ComicPage;
