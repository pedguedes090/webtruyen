import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ComicCard, ComicCardWithChapters } from '../components/ComicCard';
import RankingList from '../components/RankingList';
import { getRecentComics, getTopComics, getFeaturedComics } from '../api';
import { FireOutlined, SyncOutlined, HistoryOutlined, TrophyOutlined } from '@ant-design/icons';
import { PLACEHOLDER_SMALL } from '../constants/placeholders';

function HomePage() {
    const [featuredComics, setFeaturedComics] = useState([]);
    const [recentComics, setRecentComics] = useState([]);
    const [topComics, setTopComics] = useState([]);
    const [readingHistory, setReadingHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [featured, recent, top] = await Promise.all([
                    getFeaturedComics(10, 30),
                    getRecentComics(12),
                    getTopComics(10)
                ]);
                setFeaturedComics(featured);
                setRecentComics(recent);
                setTopComics(top);
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
    }, []);

    if (loading) {
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
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <FireOutlined className="text-primary text-lg sm:text-xl" />
                            <h2 className="text-sm sm:text-base font-semibold text-primary">Truyện đề cử</h2>
                        </div>
                        <div className="relative overflow-hidden">
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

                    {/* Recently Updated - Chapters below image */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <SyncOutlined className="text-primary text-lg sm:text-xl" />
                                <h2 className="text-sm sm:text-base font-semibold text-primary">Truyện mới cập nhật</h2>
                            </div>
                            <button
                                onClick={async () => {
                                    const recent = await getRecentComics(12);
                                    setRecentComics(recent);
                                }}
                                className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center hover:bg-primary-hover transition-colors"
                            >
                                <SyncOutlined />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                            {recentComics.map((comic, index) => (
                                <ComicCardWithChapters key={comic.id} comic={comic} index={index} />
                            ))}
                        </div>
                    </section>

                    {/* Mobile Rankings - Only visible on mobile/tablet */}
                    <section className="lg:hidden">
                        <div className="flex items-center gap-2 mb-3">
                            <TrophyOutlined className="text-primary text-base" />
                            <h2 className="text-sm font-semibold text-primary">Bảng xếp hạng tháng này</h2>
                        </div>
                        <div className="bg-white dark:bg-dark-card rounded-lg p-3 shadow-sm dark:shadow-none">
                            <RankingList comics={topComics} recentComics={recentComics} />
                        </div>
                    </section>

                    {/* Mobile Reading History - Only visible on mobile/tablet, at bottom */}
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
                                            src={item.coverUrl || PLACEHOLDER_SMALL}
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
                                            src={item.coverUrl || PLACEHOLDER_SMALL}
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

