import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ComicCard } from '../components/ComicCard';
import { getComics, getTopComics, getRecentComics, getComicsByGenre, getGenres } from '../api';
import { SearchOutlined, FireOutlined, ClockCircleOutlined, CloseCircleOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';

function SearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const sort = searchParams.get('sort') || '';
    const genre = searchParams.get('genre') || '';
    const page = parseInt(searchParams.get('page') || '1');

    const [comics, setComics] = useState([]);
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchValue, setSearchValue] = useState(query);
    const [totalCount, setTotalCount] = useState(0);
    const LIMIT = 24;

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / LIMIT);
    const hasMore = page < totalPages;

    useEffect(() => {
        async function fetchComics() {
            setLoading(true);
            const offset = (page - 1) * LIMIT;

            try {
                let response;

                if (genre) {
                    response = await getComicsByGenre(genre, LIMIT, offset);
                    setComics(response.data);
                    setTotalCount(response.total);
                } else if (sort === 'hot') {
                    response = await getTopComics(LIMIT, offset);
                    setComics(response.data);
                    setTotalCount(response.total);
                } else if (sort === 'recent') {
                    response = await getRecentComics(LIMIT, offset);
                    setComics(response.data);
                    setTotalCount(response.total);
                } else {
                    response = await getComics(LIMIT, offset, query);
                    setComics(response.data);
                    setTotalCount(response.total);
                }
            } catch (error) {
                console.error('Error searching comics:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchComics();
        window.scrollTo(0, 0);
    }, [query, sort, genre, page]);

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

    function goToPage(newPage) {
        const params = {};
        if (query) params.q = query;
        if (sort) params.sort = sort;
        if (genre) params.genre = genre;
        if (newPage > 1) params.page = newPage.toString();
        setSearchParams(params);
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

    // Generate page numbers to display
    function getPageNumbers() {
        const pages = [];
        const maxVisible = 5;

        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        // Adjust start if we're near the end
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        return pages;
    }

    const showPagination = totalPages > 1;

    return (
        <main className="max-w-7xl mx-auto px-4 py-6">
            <Helmet>
                <title>{getPageTitle()} - ComicVN</title>
                <meta name="description" content={query ? `Kết quả tìm kiếm cho "${query}" tại ComicVN` : genre ? `Truyện thể loại ${genre} tại ComicVN` : `Tìm truyện tranh tại ComicVN`} />
                <meta name="robots" content="noindex, follow" />
            </Helmet>
            {/* Search Header */}
            <div className="bg-white dark:bg-dark-card p-4 mb-4 shadow-sm dark:shadow-none">
                <h1 className="text-base font-semibold text-primary mb-3 flex items-center gap-2"><SearchOutlined /> {getPageTitle()}</h1>

                <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                    <input
                        type="text"
                        name="search"
                        autoComplete="off"
                        className="flex-1 px-3 py-2 bg-gray-100 dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary"
                        placeholder="Nhập tên truyện hoặc tác giả…"
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
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-gray-400">
                            Trang <span className="text-primary font-medium">{page}</span>
                            {hasMore && '+'} • <span className="text-primary font-medium">{comics.length}</span> truyện
                        </p>
                    </div>
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

                        {/* Pagination */}
                        {showPagination && (
                            <div className="mt-6 flex items-center justify-center gap-1">
                                {/* Previous button */}
                                <button
                                    onClick={() => goToPage(page - 1)}
                                    disabled={page === 1}
                                    className="w-10 h-10 flex items-center justify-center rounded bg-gray-100 dark:bg-dark-tertiary text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <LeftOutlined />
                                </button>

                                {/* Page numbers */}
                                {page > 3 && (
                                    <>
                                        <button
                                            onClick={() => goToPage(1)}
                                            className="w-10 h-10 flex items-center justify-center rounded bg-gray-100 dark:bg-dark-tertiary text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-border transition-colors text-sm"
                                        >
                                            1
                                        </button>
                                        {page > 4 && <span className="px-2 text-gray-400">...</span>}
                                    </>
                                )}

                                {getPageNumbers().map(p => (
                                    <button
                                        key={p}
                                        onClick={() => goToPage(p)}
                                        className={`w-10 h-10 flex items-center justify-center rounded text-sm transition-colors ${p === page
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 dark:bg-dark-tertiary text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-border'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}

                                {/* Last page indicator */}
                                {totalPages > 0 && getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
                                    <>
                                        <span className="px-2 text-gray-400">...</span>
                                        <button
                                            onClick={() => goToPage(totalPages)}
                                            className="w-10 h-10 flex items-center justify-center rounded bg-gray-100 dark:bg-dark-tertiary text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-border transition-colors text-sm"
                                        >
                                            {totalPages}
                                        </button>
                                    </>
                                )}

                                {/* Next button */}
                                <button
                                    onClick={() => goToPage(page + 1)}
                                    disabled={!hasMore}
                                    className="w-10 h-10 flex items-center justify-center rounded bg-gray-100 dark:bg-dark-tertiary text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <RightOutlined />
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
