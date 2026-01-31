import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PLACEHOLDER_COVER } from '../constants/placeholders';
import { resolveImageUrl, slugify } from '../api';
import { formatTimeAgo } from '../utils/formatters';
import LazyImage from './LazyImage';


// Vertical card for Featured section (no chapters)
export function ComicCard({ comic, showBadge = false, index = 0, compact = false }) {
    const CardWrapper = compact ? 'div' : motion.div;
    const wrapperProps = compact ? {} : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, delay: index * 0.05 },
        whileHover: { y: -4 }
    };

    return (
        <CardWrapper {...wrapperProps}>
            <Link to={`/truyen/${comic.slug || slugify(comic.title)}`} className="group block">
                <div className={`relative overflow-hidden rounded-lg ${compact ? 'aspect-[3/4] mb-1.5' : 'aspect-[3/4] mb-2'}`}>
                    <LazyImage
                        src={resolveImageUrl(comic.cover_url) || PLACEHOLDER_COVER}
                        alt={comic.title}
                        fallback={PLACEHOLDER_COVER}
                        className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                    {showBadge && comic.status && (
                        <span className={`absolute top-1 left-1 font-bold bg-gradient-to-r from-primary to-primary-hover text-white rounded z-10 ${compact ? 'px-1 py-0.5 text-[8px]' : 'px-1.5 py-0.5 text-[10px]'}`}>
                            {comic.status === 'ongoing' ? 'Đang ra' : 'Hoàn thành'}
                        </span>
                    )}
                </div>
                <h3 className={`font-medium line-clamp-2 leading-tight text-gray-800 dark:text-gray-200 group-hover:text-primary transition-colors ${compact ? 'text-[10px]' : 'text-xs'}`}>
                    {comic.title}
                </h3>
                {!compact && <p className="text-[10px] text-gray-500 mt-0.5">{comic.author || 'Đang cập nhật…'}</p>}
            </Link>
        </CardWrapper>
    );
}

// Vertical card with chapters below image (TruyenDex style)
export function ComicCardWithChapters({ comic, index = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ y: -4 }}
            className="bg-white dark:bg-dark-card rounded-lg overflow-hidden hover:ring-1 hover:ring-primary/50 transition-all shadow-sm dark:shadow-none"
        >
            {/* Image - clickable to comic page */}
            <Link to={`/truyen/${comic.slug || slugify(comic.title)}`} className="block relative aspect-[3/4] overflow-hidden">
                <LazyImage
                    src={resolveImageUrl(comic.cover_url) || PLACEHOLDER_COVER}
                    alt={comic.title}
                    fallback={PLACEHOLDER_COVER}
                    className="w-full h-full hover:scale-105 transition-transform duration-500"
                />
            </Link>

            {/* Title */}
            <div className="p-2">
                <Link to={`/truyen/${comic.slug || slugify(comic.title)}`}>
                    <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-100 hover:text-primary transition-colors line-clamp-1 mb-2">
                        {comic.title}
                    </h3>
                </Link>

                {/* Chapters list - below title */}
                <div className="space-y-1">
                    {comic.recent_chapters && comic.recent_chapters.length > 0 ? (
                        comic.recent_chapters.map(chapter => (
                            <Link
                                key={chapter.id}
                                to={`/truyen/${comic.slug || slugify(comic.title)}/chuong/${chapter.chapter_number}`}
                                className="flex items-center justify-between text-[11px] py-0.5 hover:text-primary transition-colors"
                            >
                                <span className="text-gray-600 dark:text-gray-400 truncate">
                                    Chap {chapter.chapter_number}
                                </span>
                                <span className="text-gray-400 dark:text-gray-600 ml-2 flex-shrink-0">
                                    {formatTimeAgo(chapter.created_at)}
                                </span>
                            </Link>
                        ))
                    ) : (
                        <p className="text-[10px] text-gray-400 dark:text-gray-600">Chưa có chương</p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export default ComicCard;


