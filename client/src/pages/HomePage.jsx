import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ComicCard, ComicCardWithChapters } from '../components/ComicCard';
import RankingList from '../components/RankingList';
import { getRecentComics, getTopComics, getFeaturedComics, resolveImageUrl } from '../api';
import { FireOutlined, SyncOutlined, HistoryOutlined, TrophyOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { PLACEHOLDER_SMALL } from '../constants/placeholders';

function HomePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const page = parseInt(searchParams.get('page') || '1');

    const [featuredComics, setFeaturedComics] = useState([]);
    const [recentComics, setRecentComics] = useState([]);
    const [topComics, setTopComics] = useState([]);
    const [readingHistory, setReadingHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const LIMIT = 12;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const offset = (page - 1) * LIMIT;
            try {
                const [featured, recent, top] = await Promise.all([
                    getFeaturedComics(10, 30),
                    getRecentComics(LIMIT, offset),
                    getTopComics(10)
                ]);
                setFeaturedComics(featured);
                setRecentComics(recent);
                setTopComics(top);
                setHasMore(recent.length >= LIMIT);
            } catch (error) {
                console.error('Error fetching comics:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();

        // Load reading history from localStorage
        const saved = JSON.parse(localStorage.getItem('readingHistory') || '[]');
        setReadingHistory(saved.slice(0, 5));

        // Scroll to recent section when page changes (not on initial load)
        if (page > 1) {
            setTimeout(() => {
                document.getElementById('recent-comics')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [page]);

    function goToPage(newPage) {
        if (newPage === 1) {
            setSearchParams({});
        } else {
            setSearchParams({ page: newPage.toString() });
        }
    }

    // Generate page numbers to display
    function getPageNumbers() {
        const pages = [];
        let start = Math.max(1, page - 2);
        let end = Math.min(start + 4, hasMore ? page + 1 : page);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    }

    if (loading && page === 1) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-10 h-10 border-4 border-gray-200 dark:border-dark-tertiary border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 sm:gap-6">
                {/* Main Content */}
                <div className="space-y-4 sm:space-y-6">
                    {/* Featured Comics - Auto Scroll Carousel */}
                    {page === 1 && (
                        <section>
                            <div className="flex items-center gap-2 mb-3">
                                <FireOutlined className="text-primary text-lg sm:text-xl" />
                                <h2 className="text-sm sm:text-base font-semibold text-primary">Truyện đề cử</h2>
                            </div>
                            <div className="relative overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing">
                                <div className="flex gap-3 sm:gap-4 animate-marquee hover:[animation-play-state:paused]">
                                    {/* Double the comics for seamless loop */}
                                    {[...featuredComics, ...featuredComics].map((comic, index) => (
                                        <div
                                            key={`${comic.id}-${index}`}
                                            className="flex-shrink-0 w-[calc((100%-24px)/3)] sm:w-[calc((100%-64px)/5)]"
                                        >
                                            <ComicCard comic={comic} showBadge index={index % featuredComics.length} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Recently Updated - Chapters below image */}
                    <section id="recent-comics">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <SyncOutlined className="text-primary text-lg sm:text-xl" />
                                <h2 className="text-sm sm:text-base font-semibold text-primary">
                                    Truyện mới cập nhật
                                    {page > 1 && <span className="text-gray-400 font-normal ml-2">Trang {page}</span>}
                                </h2>
                            </div>
                            <button
                                onClick={async () => {
                                    const offset = (page - 1) * LIMIT;
                                    const recent = await getRecentComics(LIMIT, offset);
                                    setRecentComics(recent);
                                }}
                                className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center hover:bg-primary-hover transition-colors"
                            >
                                <SyncOutlined />
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="w-10 h-10 border-4 border-gray-200 dark:border-dark-tertiary border-t-primary rounded-full animate-spin" />
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                                    {recentComics.map((comic, index) => (
                                        <ComicCardWithChapters key={comic.id} comic={comic} index={index} />
                                    ))}
                                </div>

                                {/* Pagination */}
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

                                    {hasMore && <span className="px-2 text-gray-400">...</span>}

                                    {/* Next button */}
                                    <button
                                        onClick={() => goToPage(page + 1)}
                                        disabled={!hasMore}
                                        className="w-10 h-10 flex items-center justify-center rounded bg-gray-100 dark:bg-dark-tertiary text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <RightOutlined />
                                    </button>
                                </div>
                            </>
                        )}
                    </section>

                    {/* Mobile Rankings - Only visible on mobile/tablet */}
                    {page === 1 && (
                        <section className="lg:hidden">
                            <div className="flex items-center gap-2 mb-3">
                                <TrophyOutlined className="text-primary text-base" />
                                <h2 className="text-sm font-semibold text-primary">Bảng xếp hạng tháng này</h2>
                            </div>
                            <div className="bg-white dark:bg-dark-card rounded-lg p-3 shadow-sm dark:shadow-none">
                                <RankingList comics={topComics} recentComics={recentComics} />
                            </div>
                        </section>
                    )}

                    {/* Mobile Reading History - Only visible on mobile/tablet, at bottom */}
                    {page === 1 && (
                        <section className="lg:hidden">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <HistoryOutlined className="text-primary text-base" />
                                    <h2 className="text-sm font-semibold text-primary">Lịch sử đọc</h2>
                                </div>
                                <Link to="/history" className="text-xs text-gray-500 hover:text-primary">Xem tất cả</Link>
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                                {readingHistory.length > 0 ? (
                                    readingHistory.map(item => (
                                        <Link key={item.comicId} to={`/truyen/${item.comicSlug}`} className="flex-shrink-0 w-14 sm:w-16">
                                            <img
                                                src={resolveImageUrl(item.coverUrl) || PLACEHOLDER_SMALL}
                                                alt={item.comicTitle}
                                                className="w-14 sm:w-16 h-20 sm:h-22 rounded object-cover hover:ring-2 hover:ring-primary transition-all"
                                            />
                                        </Link>
                                    ))
                                ) : (
                                    <p className="text-xs text-gray-500">Chưa có lịch sử đọc</p>
                                )}
                            </div>
                        </section>
                    )}
                </div>

                {/* Sidebar - Desktop only */}
                <aside className="space-y-6 hidden lg:block">
                    {/* Reading History */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <HistoryOutlined className="text-primary text-lg" />
                                <h2 className="text-sm font-semibold text-primary">Lịch sử đọc truyện</h2>
                            </div>
                            <Link to="/history" className="text-xs text-gray-500 hover:text-primary">Xem tất cả</Link>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {readingHistory.length > 0 ? (
                                readingHistory.map(item => (
                                    <Link key={item.comicId} to={`/truyen/${item.comicSlug}`} className="flex-shrink-0 w-12">
                                        <img
                                            src={resolveImageUrl(item.coverUrl) || PLACEHOLDER_SMALL}
                                            alt={item.comicTitle}
                                            className="w-12 h-16 rounded object-cover hover:ring-2 hover:ring-primary transition-all"
                                        />
                                    </Link>
                                ))
                            ) : (
                                <p className="text-xs text-gray-500">Chưa có lịch sử đọc</p>
                            )}
                        </div>
                    </section>

                    {/* Rankings */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <TrophyOutlined className="text-primary text-lg" />
                            <h2 className="text-sm font-semibold text-primary">Bảng xếp hạng tháng này</h2>
                        </div>
                        <RankingList comics={topComics} recentComics={recentComics} />
                    </section>
                </aside>
            </div>
        </main>
    );
}

export default HomePage;
