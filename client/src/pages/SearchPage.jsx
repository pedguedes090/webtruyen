import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ComicCard } from '../components/ComicCard';
import { getComics, getTopComics, getRecentComics, getComicsByGenre, getGenres } from '../api';
import { SearchOutlined, FireOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

function SearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const sort = searchParams.get('sort') || '';
    const genre = searchParams.get('genre') || '';

    const [comics, setComics] = useState([]);
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchValue, setSearchValue] = useState(query);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const LIMIT = 24;

    useEffect(() => {
        async function fetchComics() {
            setLoading(true);
            setOffset(0);
            setHasMore(true);

            try {
                let data = [];

                if (genre) {
                    data = await getComicsByGenre(genre, LIMIT, 0);
                } else if (sort === 'hot') {
                    data = await getTopComics(LIMIT);
                } else if (sort === 'recent') {
                    data = await getRecentComics(LIMIT);
                } else {
                    data = await getComics(LIMIT, 0, query);
                }

                setComics(data);
                setHasMore(data.length >= LIMIT);
            } catch (error) {
                console.error('Error searching comics:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchComics();
    }, [query, sort, genre]);

    useEffect(() => {
        async function fetchGenres() {
            try {
                const data = await getGenres();
                setGenres(data);
            } catch (error) {
                console.error('Error fetching genres:', error);
            }
        }
        fetchGenres();
    }, []);

    async function loadMore() {
        if (loadingMore || !hasMore) return;

        setLoadingMore(true);
        const newOffset = offset + LIMIT;

        try {
            let data = [];

            if (genre) {
                data = await getComicsByGenre(genre, LIMIT, newOffset);
            } else {
                data = await getComics(LIMIT, newOffset, query);
            }

            setComics(prev => [...prev, ...data]);
            setOffset(newOffset);
            setHasMore(data.length >= LIMIT);
        } catch (error) {
            console.error('Error loading more:', error);
        } finally {
            setLoadingMore(false);
        }
    }

    function handleSearch(e) {
        e.preventDefault();
        const params = {};
        if (searchValue.trim()) params.q = searchValue.trim();
        setSearchParams(params);
    }

    function handleGenreClick(g) {
        setSearchParams({ genre: g });
    }

    function handleSortClick(s) {
        setSearchParams({ sort: s });
    }

    function clearFilters() {
        setSearchParams({});
        setSearchValue('');
    }

    function getPageTitle() {
        if (genre) return `Thể loại: ${genre}`;
        if (sort === 'hot') return 'Truyện HOT';
        if (sort === 'recent') return 'Mới cập nhật';
        if (query) return `Kết quả: "${query}"`;
        return 'Tìm kiếm truyện';
    }

    return (
        <main className="max-w-7xl mx-auto px-4 py-6">
            {/* Search Header */}
            <div className="bg-white dark:bg-dark-card p-4 mb-4 shadow-sm dark:shadow-none">
                <h1 className="text-base font-semibold text-primary mb-3 flex items-center gap-2"><SearchOutlined /> {getPageTitle()}</h1>

                <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                    <input
                        type="text"
                        className="flex-1 px-3 py-2 bg-gray-100 dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-primary"
                        placeholder="Nhập tên truyện hoặc tác giả..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                    />
                    <button type="submit" className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-hover">
                        Tìm
                    </button>
                </form>

                {/* Sort buttons */}
                <div className="flex flex-wrap gap-2 mb-3">
                    <button
                        onClick={() => handleSortClick('hot')}
                        className={`px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1 ${sort === 'hot' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-dark-tertiary text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-white'
                            }`}
                    >
                        <FireOutlined /> HOT
                    </button>
                    <button
                        onClick={() => handleSortClick('recent')}
                        className={`px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1 ${sort === 'recent' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-dark-tertiary text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-white'
                            }`}
                    >
                        <ClockCircleOutlined /> Mới cập nhật
                    </button>
                    {(query || sort || genre) && (
                        <button
                            onClick={clearFilters}
                            className="px-3 py-1 text-xs font-medium bg-gray-200 dark:bg-dark-tertiary text-gray-600 dark:text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1"
                        >
                            <CloseCircleOutlined /> Xóa bộ lọc
                        </button>
                    )}
                </div>

                {/* Genre chips */}
                {genres.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {genres.slice(0, 15).map(g => (
                            <button
                                key={g}
                                onClick={() => handleGenreClick(g)}
                                className={`px-2 py-0.5 text-[11px] transition-colors ${genre === g ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-dark-secondary text-gray-600 dark:text-gray-400 hover:text-primary'
                                    }`}
                            >
                                {g}
                            </button>
                        ))}
                        {genres.length > 15 && (
                            <Link to="/genres" className="px-2 py-0.5 text-[11px] text-primary hover:underline">
                                Xem tất cả →
                            </Link>
                        )}
                    </div>
                )}
            </div>

            {/* Results */}
            <div className="bg-white dark:bg-dark-card p-4 shadow-sm dark:shadow-none">
                {!loading && (
                    <p className="text-sm text-gray-400 mb-4">
                        Tìm thấy <span className="text-primary font-medium">{comics.length}</span> truyện
                        {hasMore && '+'}
                    </p>
                )}

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-10 h-10 border-4 border-gray-200 dark:border-dark-tertiary border-t-primary rounded-full animate-spin" />
                    </div>
                ) : comics.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                            {comics.map((comic, index) => (
                                <ComicCard key={comic.id} comic={comic} showBadge index={index} />
                            ))}
                        </div>

                        {hasMore && !sort && (
                            <div className="mt-6 text-center">
                                <button
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    className="px-6 py-2 bg-gray-200 dark:bg-dark-tertiary text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-dark-secondary transition-colors disabled:opacity-50"
                                >
                                    {loadingMore ? 'Đang tải...' : 'Tải thêm'}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="py-12 text-center">
                        <p className="text-gray-400 mb-2">Không tìm thấy truyện nào</p>
                        <p className="text-sm text-gray-600">Thử tìm với từ khóa khác</p>
                    </div>
                )}
            </div>
        </main>
    );
}

export default SearchPage;

