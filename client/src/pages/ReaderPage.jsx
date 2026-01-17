import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getChapter, getChapterBySlugAndNumber, getComic, getComicBySlug, getChapters, resolveImageUrl, slugify } from '../api';
import CanvasImage from '../components/CanvasImage';
import {
    LeftOutlined,
    RightOutlined,
    HomeOutlined,
    UnorderedListOutlined,
    VerticalAlignTopOutlined,
    ArrowLeftOutlined,
    DownOutlined,
    CloudServerOutlined,
    GlobalOutlined,
    SettingOutlined,
    ReloadOutlined,
    ZoomInOutlined,
    ZoomOutOutlined
} from '@ant-design/icons';

function ReaderPage() {
    const { id, slug, number } = useParams();
    const navigate = useNavigate();
    const [chapter, setChapter] = useState(null);
    const [comic, setComic] = useState(null);
    const [allChapters, setAllChapters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNav, setShowNav] = useState(true);
    const [showChapterList, setShowChapterList] = useState(false);
    const [readingProgress, setReadingProgress] = useState(0);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Server state
    const [servers, setServers] = useState([]);
    const [currentServer, setCurrentServer] = useState(null);
    const [showServerList, setShowServerList] = useState(false);

    // Settings state
    const [showSettings, setShowSettings] = useState(false);
    const [imageScale, setImageScale] = useState(() => {
        return localStorage.getItem('readerImageScale') || 'medium';
    });
    const [imageKey, setImageKey] = useState(0); // For forcing image reload

    useEffect(() => {
        const fetchData = async () => {
            setIsTransitioning(true);
            try {
                let chapterData, comicData;

                if (slug && number) {
                    // New SEO-friendly URL: /truyen/:slug/chuong/:number
                    chapterData = await getChapterBySlugAndNumber(slug, parseFloat(number));
                    // Fetch full comic data to get cover_url for history
                    comicData = await getComicBySlug(slug);
                } else {
                    // Legacy URL: /read/:id
                    chapterData = await getChapter(id);
                    comicData = await getComic(chapterData.comic_id);
                }

                const chaptersData = await getChapters(comicData.id);

                setChapter(chapterData);
                setComic(comicData);
                setAllChapters(chaptersData);

                // Parse server data
                if (chapterData && chapterData.image_urls) {
                    let parsedUrls = [];
                    try {
                        // Check if it's new format (array of objects) or legacy (array of strings)
                        if (Array.isArray(chapterData.image_urls) && chapterData.image_urls.length > 0 && typeof chapterData.image_urls[0] === 'object') {
                            setServers(chapterData.image_urls);
                            setCurrentServer(chapterData.image_urls[0]);
                        } else {
                            // Legacy format
                            const legacyServer = { server_name: 'Server Chính', image_urls: chapterData.image_urls };
                            setServers([legacyServer]);
                            setCurrentServer(legacyServer);
                        }
                    } catch (e) {
                        console.error("Error parsing image urls", e);
                        setServers([]);
                    }
                }

                saveToHistory(comicData, chapterData);
            } catch (error) {
                console.error('Error fetching chapter:', error);
            } finally {
                setLoading(false);
                // Delay để animation fade in chạy mượt
                setTimeout(() => setIsTransitioning(false), 50);
            }
        };
        fetchData();
        window.scrollTo(0, 0);
        setReadingProgress(0);
    }, [id, slug, number]);

    function saveToHistory(comicData, chapterData) {
        const history = JSON.parse(localStorage.getItem('readingHistory') || '[]');
        const existing = history.findIndex(h => h.comicId === comicData.id);

        const entry = {
            comicId: comicData.id,
            comicSlug: comicData.slug || slugify(comicData.title),
            comicTitle: comicData.title,
            coverUrl: comicData.cover_url,
            chapterId: chapterData.id,
            chapterNumber: chapterData.chapter_number,
            timestamp: Date.now()
        };

        if (existing !== -1) {
            history.splice(existing, 1);
        }
        history.unshift(entry);
        localStorage.setItem('readingHistory', JSON.stringify(history.slice(0, 50)));
    }

    const goToPrevChapter = useCallback(() => {
        if (chapter?.prev_chapter && comic) {
            const comicSlug = comic.slug || slugify(comic.title);
            navigate(`/truyen/${comicSlug}/chuong/${chapter.prev_chapter.chapter_number}`);
        }
    }, [chapter, comic, navigate]);

    const goToNextChapter = useCallback(() => {
        if (chapter?.next_chapter && comic) {
            const comicSlug = comic.slug || slugify(comic.title);
            navigate(`/truyen/${comicSlug}/chuong/${chapter.next_chapter.chapter_number}`);
        }
    }, [chapter, comic, navigate]);

    // Keyboard shortcuts
    useEffect(() => {
        function handleKeyPress(e) {
            if (e.key === 'ArrowLeft') {
                goToPrevChapter();
            } else if (e.key === 'ArrowRight') {
                goToNextChapter();
            } else if (e.key === 'Escape') {
                setShowChapterList(false);
            }
        }
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [goToPrevChapter, goToNextChapter]);

    // Scroll handling
    useEffect(() => {
        let lastScroll = 0;
        const handleScroll = () => {
            const current = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = docHeight > 0 ? (current / docHeight) * 100 : 0;

            setReadingProgress(progress);
            setShowNav(current < lastScroll || current < 100);
            setShowScrollTop(current > 500);
            lastScroll = current;
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    function goToChapter(ch) {
        if (comic) {
            const comicSlug = comic.slug || slugify(comic.title);
            navigate(`/truyen/${comicSlug}/chuong/${ch.chapter_number}`);
        }
        setShowChapterList(false);
    }

    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Image scale options
    const scaleOptions = [
        { value: 'small', label: 'Nhỏ', class: 'max-w-md' },
        { value: 'medium', label: 'Vừa', class: 'max-w-2xl' },
        { value: 'large', label: 'Lớn', class: 'max-w-4xl' },
        { value: 'full', label: 'Toàn màn', class: 'max-w-full' },
    ];

    function getScaleClass() {
        const option = scaleOptions.find(o => o.value === imageScale);
        return option ? option.class : 'max-w-2xl';
    }

    function handleScaleChange(scale) {
        setImageScale(scale);
        localStorage.setItem('readerImageScale', scale);
    }

    function reloadImages() {
        setImageKey(prev => prev + 1);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="w-10 h-10 border-4 border-gray-300 dark:border-gray-700 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (!chapter) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-10 text-center">
                <h2 className="text-xl font-semibold mb-4">Không tìm thấy chương</h2>
                <Link to="/" className="px-4 py-2 bg-primary text-white">Về trang chủ</Link>
            </div>
        );
    }

    const currentIndex = allChapters.findIndex(ch => ch.id === chapter.id);
    const totalChapters = allChapters.length;

    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
            {/* Reading Progress Bar */}
            <div className="fixed top-0 left-0 right-0 h-0.5 z-[60] bg-gray-300 dark:bg-gray-800">
                <div
                    className="h-full bg-primary transition-all duration-150"
                    style={{ width: `${readingProgress}%` }}
                />
            </div>

            {/* Top Nav - Centered */}
            <div className={`fixed top-0.5 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur transition-transform duration-300 ${showNav ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="max-w-screen-xl mx-auto px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-center gap-1.5 sm:gap-3">
                    {/* Back button */}
                    <Link
                        to={comic ? `/truyen/${comic.slug || slugify(comic.title)}` : '/'}
                        className="text-gray-500 dark:text-gray-400 hover:text-primary p-2 flex-shrink-0 text-lg"
                        title="Quay lại"
                    >
                        <ArrowLeftOutlined />
                    </Link>

                    {/* Prev button */}
                    <button
                        onClick={goToPrevChapter}
                        disabled={!chapter.prev_chapter}
                        className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-700 dark:text-white bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded text-sm sm:text-base"
                        title="Chương trước"
                    >
                        <LeftOutlined />
                    </button>

                    {/* Chapter selector */}
                    <button
                        onClick={() => setShowChapterList(!showChapterList)}
                        className="min-w-[100px] sm:min-w-[180px] h-8 sm:h-10 px-2 sm:px-4 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-white text-xs sm:text-sm rounded flex items-center justify-center gap-1 sm:gap-2"
                    >
                        <span>Ch. {chapter.chapter_number}</span>
                        <span className="text-[10px] sm:text-xs text-gray-500">/ {totalChapters}</span>
                        <DownOutlined className="text-[10px] sm:text-xs" />
                    </button>

                    {/* Server Selector (Only if > 1 server) */}
                    {servers.length > 1 && (
                        <div className="relative">
                            <button
                                onClick={() => setShowServerList(!showServerList)}
                                className="h-10 px-3 bg-gray-200 dark:bg-dark-tertiary hover:bg-gray-300 dark:hover:bg-dark-border text-gray-800 dark:text-white text-sm rounded flex items-center justify-center gap-2 transition-colors"
                                title="Chọn Server Ảnh"
                            >
                                <CloudServerOutlined />
                                <span className="hidden sm:inline">{currentServer?.server_name || 'Server'}</span>
                                <DownOutlined className="text-xs" />
                            </button>

                            <AnimatePresence>
                                {showServerList && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowServerList(false)} />
                                        <motion.div
                                            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 min-w-[150px] bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-xl rounded-lg overflow-hidden z-50 py-1"
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                        >
                                            {servers.map((s, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        setCurrentServer(s);
                                                        setShowServerList(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-tertiary flex items-center gap-2 ${currentServer === s ? 'text-primary font-medium bg-primary/5' : 'text-gray-700 dark:text-gray-300'}`}
                                                >
                                                    <GlobalOutlined className="text-xs" />
                                                    {s.server_name}
                                                </button>
                                            ))}
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Next button */}
                    <button
                        onClick={goToNextChapter}
                        disabled={!chapter.next_chapter}
                        className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-gray-700 dark:text-white bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded text-sm sm:text-base"
                        title="Chương sau"
                    >
                        <RightOutlined />
                    </button>

                    {/* Home button */}
                    <Link
                        to="/"
                        className="text-gray-500 dark:text-gray-400 hover:text-primary p-2 flex-shrink-0 text-lg"
                        title="Trang chủ"
                    >
                        <HomeOutlined />
                    </Link>
                </div>
            </div>

            {/* Chapter List Dropdown */}
            <AnimatePresence>
                {showChapterList && (
                    <>
                        <motion.div
                            className="fixed inset-0 z-40 bg-black/50"
                            onClick={() => setShowChapterList(false)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />
                        <motion.div
                            className="fixed top-14 left-1/2 z-50 w-[90vw] max-w-sm max-h-[70vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden rounded-lg"
                            initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
                            animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
                            exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900">
                                <span className="text-sm font-medium text-gray-800 dark:text-white">Danh sách chương</span>
                                <span className="text-xs text-gray-500">{currentIndex + 1}/{totalChapters}</span>
                            </div>
                            <div className="max-h-[calc(70vh-50px)] overflow-y-auto">
                                {allChapters.map((ch, idx) => (
                                    <button
                                        key={ch.id}
                                        onClick={() => goToChapter(ch)}
                                        className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 dark:border-gray-800 ${ch.id === chapter.id
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        <span className="text-gray-400 mr-2">{idx + 1}.</span>
                                        Chương {ch.chapter_number}
                                        {ch.title && <span className="text-gray-500 ml-1">- {ch.title}</span>}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Images Container - Auto responsive with transition */}
            <motion.div
                className={`w-full ${getScaleClass()} mx-auto pt-14`}
                onClick={() => setShowNav(!showNav)}
                initial={{ opacity: 0 }}
                animate={{ opacity: isTransitioning ? 0 : 1 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
                {currentServer && currentServer.image_urls && currentServer.image_urls.length > 0 ? (
                    currentServer.image_urls.map((url, index) => (
                        <CanvasImage
                            key={`${currentServer.server_name}-${index}-${imageKey}`}
                            src={resolveImageUrl(url)}
                            alt={`Trang ${index + 1}`}
                            className="w-full block select-none"
                        />
                    ))
                ) : (
                    <div className="py-20 text-center text-gray-500">
                        <p>Chưa có ảnh cho server này.</p>
                        {servers.length > 1 && <p className="text-xs mt-2">Hãy thử đổi server khác</p>}
                    </div>
                )}
            </motion.div>

            {/* Bottom Navigation */}
            <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-4 sm:py-6">
                <div className="max-w-lg mx-auto px-4">
                    {/* End message */}
                    <p className="text-center text-sm text-gray-500 mb-4">
                        {chapter.next_chapter
                            ? `— Hết Chương ${chapter.chapter_number} —`
                            : '🎉 Đã đọc hết truyện!'}
                    </p>

                    {/* Navigation buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={goToPrevChapter}
                            disabled={!chapter.prev_chapter}
                            className="flex-1 py-3 text-sm bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded flex items-center justify-center gap-2"
                        >
                            <LeftOutlined /> Trước
                        </button>

                        <Link
                            to={comic ? `/truyen/${comic.slug || slugify(comic.title)}` : '/'}
                            className="py-3 px-4 text-sm bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 rounded flex items-center justify-center"
                        >
                            <UnorderedListOutlined />
                        </Link>

                        {/* Settings button */}
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`py-3 px-4 text-sm rounded flex items-center justify-center transition-colors ${showSettings
                                ? 'bg-primary text-white'
                                : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700'
                                }`}
                            title="Cài đặt"
                        >
                            <SettingOutlined />
                        </button>

                        <button
                            onClick={goToNextChapter}
                            disabled={!chapter.next_chapter}
                            className={`flex-1 py-3 text-sm rounded flex items-center justify-center gap-2 ${chapter.next_chapter
                                ? 'bg-primary text-white hover:bg-primary-hover'
                                : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {chapter.next_chapter ? 'Tiếp' : 'Hết'} <RightOutlined />
                        </button>
                    </div>

                    {/* Settings Panel */}
                    <AnimatePresence>
                        {showSettings && (
                            <motion.div
                                className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                {/* Reload button */}
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Tải lại ảnh</span>
                                    <button
                                        onClick={reloadImages}
                                        className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary-hover flex items-center gap-2 transition-colors"
                                    >
                                        <ReloadOutlined /> Reload
                                    </button>
                                </div>

                                {/* Image scale */}
                                <div>
                                    <span className="text-sm text-gray-700 dark:text-gray-300 block mb-2">Kích thước ảnh</span>
                                    <div className="flex gap-2 flex-wrap">
                                        {scaleOptions.map(option => (
                                            <button
                                                key={option.value}
                                                onClick={() => handleScaleChange(option.value)}
                                                className={`px-3 py-2 text-sm rounded transition-colors ${imageScale === option.value
                                                    ? 'bg-primary text-white'
                                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                    }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Scroll to top - auto hide like top nav */}
            <AnimatePresence>
                {showScrollTop && showNav && (
                    <motion.button
                        onClick={scrollToTop}
                        className="fixed bottom-24 right-4 w-12 h-12 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-white rounded-full shadow-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors flex items-center justify-center z-40 text-lg"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <VerticalAlignTopOutlined />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Floating Settings button - auto hide like top nav */}
            <AnimatePresence>
                {showNav && (
                    <motion.button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`fixed bottom-10 right-4 w-12 h-12 rounded-full shadow-lg transition-colors flex items-center justify-center z-40 text-lg ${showSettings
                            ? 'bg-primary text-white'
                            : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700'
                            }`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Cài đặt"
                    >
                        <SettingOutlined />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Floating Settings Panel */}
            <AnimatePresence>
                {showSettings && (
                    <>
                        <motion.div
                            className="fixed inset-0 z-30"
                            onClick={() => setShowSettings(false)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />
                        <motion.div
                            className="fixed bottom-40 right-4 w-72 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <SettingOutlined /> Cài đặt đọc truyện
                            </h3>

                            {/* Reload button */}
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Tải lại ảnh</span>
                                <button
                                    onClick={() => { reloadImages(); setShowSettings(false); }}
                                    className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-hover flex items-center gap-1.5 transition-colors"
                                >
                                    <ReloadOutlined /> Reload
                                </button>
                            </div>

                            {/* Image scale */}
                            <div>
                                <span className="text-sm text-gray-600 dark:text-gray-400 block mb-3">Kích thước ảnh</span>
                                <div className="grid grid-cols-2 gap-2">
                                    {scaleOptions.map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => { handleScaleChange(option.value); }}
                                            className={`px-3 py-2 text-sm rounded-lg transition-colors ${imageScale === option.value
                                                ? 'bg-primary text-white'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Side tap zones for desktop */}
            <button
                onClick={goToPrevChapter}
                disabled={!chapter.prev_chapter}
                className="fixed left-0 top-1/2 -translate-y-1/2 w-16 h-40 hidden lg:flex items-center justify-center text-gray-400/0 hover:text-gray-600 dark:hover:text-white/50 hover:bg-gray-200/50 dark:hover:bg-white/5 transition-all disabled:hidden text-2xl"
            >
                <LeftOutlined />
            </button>
            <button
                onClick={goToNextChapter}
                disabled={!chapter.next_chapter}
                className="fixed right-0 top-1/2 -translate-y-1/2 w-16 h-40 hidden lg:flex items-center justify-center text-gray-400/0 hover:text-gray-600 dark:hover:text-white/50 hover:bg-gray-200/50 dark:hover:bg-white/5 transition-all disabled:hidden text-2xl"
            >
                <RightOutlined />
            </button>
        </div>
    );
}

export default ReaderPage;
