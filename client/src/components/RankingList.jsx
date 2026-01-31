import { Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { PLACEHOLDER_SMALL } from '../constants/placeholders';
import { resolveImageUrl } from '../api';

function RankingList({ comics, recentComics = [] }) {
    const [activeTab, setActiveTab] = useState('top');

    function formatViews(views) {
        if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
        if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
        return views?.toString() || '0';
    }

    const tabs = [
        { id: 'top', label: 'Top' },
        { id: 'new', label: 'Mới' },
    ];

    const displayComics = useMemo(() => {
        switch (activeTab) {
            case 'new':
                // Sort by updated_at or use recentComics if provided
                if (recentComics.length > 0) {
                    return recentComics.slice(0, 5);
                }
                return [...comics]
                    .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
                    .slice(0, 5);
            case 'top':
            default:
                // Sort by views (top)
                return [...comics]
                    .sort((a, b) => (b.views || 0) - (a.views || 0))
                    .slice(0, 5);
        }
    }, [activeTab, comics, recentComics]);

    return (
        <div>
            {/* Tabs */}
            <div className="flex gap-1 mb-3 relative">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`relative px-4 py-2.5 min-h-[44px] text-xs font-medium rounded transition-all ${activeTab === tab.id
                            ? 'text-white'
                            : 'bg-gray-200 dark:bg-dark-tertiary text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-white'
                            }`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {activeTab === tab.id && (
                            <motion.span
                                layoutId="activeTabBg"
                                className="absolute inset-0 bg-primary rounded"
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                            />
                        )}
                        <span className="relative z-10">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* List */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    className="space-y-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                >
                    {displayComics.map((comic, index) => (
                        <motion.div
                            key={comic.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                        >
                            <Link
                                to={`/comic/${comic.id}`}
                                className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-dark-tertiary transition-colors group"
                            >
                                {/* Rank number with background */}
                                <div className="relative w-12 h-16 flex-shrink-0">
                                    <img
                                        src={resolveImageUrl(comic.cover_url) || PLACEHOLDER_SMALL}
                                        alt={comic.title}
                                        width={48}
                                        height={64}
                                        className="w-full h-full object-cover rounded"
                                    />
                                    <span className={`absolute -left-1 -bottom-1 w-5 h-5 flex items-center justify-center text-xs font-bold rounded ${index === 0 ? 'bg-yellow-500 text-yellow-900' :
                                        index === 1 ? 'bg-gray-400 text-gray-800' :
                                            index === 2 ? 'bg-orange-600 text-white' :
                                                'bg-gray-200 dark:bg-dark-tertiary text-gray-600 dark:text-gray-400'
                                        }`}>
                                        {index + 1}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-medium text-gray-800 dark:text-gray-200 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                                        {comic.title}
                                    </h4>
                                    <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                        {activeTab === 'top' ? (
                                            <><EyeOutlined /> {formatViews(comic.views)}</>
                                        ) : (
                                            <><ClockCircleOutlined /> {comic.latest_chapter ? `Chap ${comic.latest_chapter}` : 'Mới cập nhật'}</>
                                        )}
                                    </span>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

export default RankingList;

