import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeContext } from '../App';
import { useAuth } from '../context/AuthContext';
import {
    HomeOutlined,
    SearchOutlined,
    SunOutlined,
    MoonOutlined,
    UserOutlined,
    DownOutlined,
    HeartOutlined,
    PushpinOutlined,
    HistoryOutlined,
    LogoutOutlined,
    SettingOutlined,
    BookOutlined,
    MenuOutlined,
    CloseOutlined
} from '@ant-design/icons';

function Header() {
    const { theme, toggleTheme } = useContext(ThemeContext);
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    function handleSearch(e) {
        e.preventDefault();
        const query = e.target.search.value.trim();
        if (query) {
            navigate(`/search?q=${encodeURIComponent(query)}`);
            setShowMobileMenu(false);
        }
    }

    function handleLogout() {
        logout();
        setShowUserMenu(false);
        setShowMobileMenu(false);
        navigate('/');
    }

    const navItems = [
        { label: 'THEO DÕI', to: '/following' },
        { label: 'HOT', to: '/search?sort=hot' },
        { label: 'YÊU THÍCH', to: '/favorites' },
        { label: 'MỚI CẬP NHẬT', to: '/search?sort=recent' },
        { label: 'LỊCH SỬ', to: '/history' },
        { label: 'THỂ LOẠI', to: '/genres' },
        { label: 'TÌM TRUYỆN', to: '/search' },
    ];

    return (
        <header className="sticky top-0 z-50">
            {/* Top bar */}
            <div className="bg-primary dark:bg-[#5a3e85] py-2">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-4">
                    {/* Mobile menu button */}
                    <button
                        onClick={() => setShowMobileMenu(true)}
                        className="md:hidden text-white text-xl p-1 hover:text-yellow-300 transition-colors"
                        aria-label="Menu"
                    >
                        <MenuOutlined />
                    </button>

                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-1.5 sm:gap-2 text-white font-bold text-base sm:text-lg">
                        <BookOutlined className="text-lg sm:text-xl" />
                        <span className="text-white">Truyện</span>
                        <span>Dex</span>
                    </Link>

                    {/* Search - Hidden on very small screens, visible on sm+ */}
                    <form className="hidden sm:flex flex-1 max-w-md" onSubmit={handleSearch}>
                        <div className="relative w-full">
                            <input
                                type="text"
                                name="search"
                                className="w-full px-3 sm:px-4 py-1.5 pr-10 bg-white rounded text-sm text-gray-800 outline-none"
                                placeholder="Tìm truyện..."
                            />
                            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary">
                                <SearchOutlined />
                            </button>
                        </div>
                    </form>

                    {/* Right actions */}
                    <div className="flex items-center gap-2 sm:gap-3 text-white text-sm">
                        {/* Mobile search button */}
                        <Link to="/search" className="sm:hidden text-lg p-1 hover:text-yellow-300 transition-colors">
                            <SearchOutlined />
                        </Link>

                        <button onClick={toggleTheme} className="hover:text-yellow-300 transition-colors text-lg" title="Chuyển theme">
                            {theme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
                        </button>

                        {isAuthenticated ? (
                            <div className="relative">
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="flex items-center gap-1 hover:text-yellow-300 transition-colors"
                                >
                                    <UserOutlined />
                                    <span className="hidden sm:inline">{user?.username}</span>
                                    <DownOutlined className="text-xs" />
                                </button>

                                <AnimatePresence>
                                    {showUserMenu && (
                                        <>
                                            <motion.div
                                                className="fixed inset-0"
                                                onClick={() => setShowUserMenu(false)}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                            />
                                            <motion.div
                                                className="absolute right-0 top-8 w-44 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-lg z-50 rounded-lg overflow-hidden"
                                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                            >
                                                <Link
                                                    to="/favorites"
                                                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-tertiary hover:text-primary"
                                                    onClick={() => setShowUserMenu(false)}
                                                >
                                                    <HeartOutlined /> Yêu thích
                                                </Link>
                                                <Link
                                                    to="/following"
                                                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-tertiary hover:text-primary"
                                                    onClick={() => setShowUserMenu(false)}
                                                >
                                                    <PushpinOutlined /> Theo dõi
                                                </Link>
                                                <Link
                                                    to="/history"
                                                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-tertiary hover:text-primary"
                                                    onClick={() => setShowUserMenu(false)}
                                                >
                                                    <HistoryOutlined /> Lịch sử
                                                </Link>
                                                <hr className="border-gray-200 dark:border-dark-border" />
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-tertiary hover:text-red-400"
                                                >
                                                    <LogoutOutlined /> Đăng xuất
                                                </button>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <Link to="/login" className="flex items-center gap-1 hover:text-yellow-300 transition-colors">
                                <UserOutlined /> <span className="hidden xs:inline">Đăng nhập</span>
                            </Link>
                        )}


                    </div>
                </div>
            </div>

            {/* Desktop Nav bar - Hidden on mobile */}
            <div className="hidden md:block bg-gray-100 dark:bg-dark-secondary border-b border-gray-200 dark:border-dark-border">
                <div className="max-w-7xl mx-auto px-4">
                    <nav className="flex items-center gap-1 overflow-x-auto py-2">
                        <Link to="/" className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-white transition-colors text-lg">
                            <HomeOutlined />
                        </Link>
                        {navItems.map((item, i) => (
                            <Link
                                key={i}
                                to={item.to}
                                className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-white whitespace-nowrap transition-colors"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {showMobileMenu && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            className="fixed inset-0 bg-black/50 z-50 md:hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowMobileMenu(false)}
                        />

                        {/* Slide-out Menu */}
                        <motion.div
                            className="fixed top-0 left-0 bottom-0 w-72 max-w-[80vw] bg-white dark:bg-dark-card z-50 md:hidden shadow-2xl"
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'tween', duration: 0.25 }}
                        >
                            {/* Menu Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border bg-primary dark:bg-[#5a3e85]">
                                <Link to="/" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-2 text-white font-bold text-lg">
                                    <BookOutlined className="text-xl" />
                                    <span>TruyệnDex</span>
                                </Link>
                                <button
                                    onClick={() => setShowMobileMenu(false)}
                                    className="text-white text-xl p-1 hover:text-yellow-300 transition-colors"
                                >
                                    <CloseOutlined />
                                </button>
                            </div>

                            {/* Mobile Search */}
                            <form className="p-4 border-b border-gray-200 dark:border-dark-border" onSubmit={handleSearch}>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="search"
                                        className="w-full px-4 py-2.5 pr-10 bg-gray-100 dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border rounded-lg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-primary"
                                        placeholder="Tìm truyện..."
                                    />
                                    <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary">
                                        <SearchOutlined />
                                    </button>
                                </div>
                            </form>

                            {/* Navigation Links */}
                            <nav className="py-2">
                                <Link
                                    to="/"
                                    onClick={() => setShowMobileMenu(false)}
                                    className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-tertiary hover:text-primary transition-colors"
                                >
                                    <HomeOutlined className="text-lg" />
                                    <span className="font-medium">Trang chủ</span>
                                </Link>
                                {navItems.map((item, i) => (
                                    <Link
                                        key={i}
                                        to={item.to}
                                        onClick={() => setShowMobileMenu(false)}
                                        className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-tertiary hover:text-primary transition-colors"
                                    >
                                        <span className="w-5 text-center text-primary text-xs">•</span>
                                        <span className="text-sm">{item.label}</span>
                                    </Link>
                                ))}
                            </nav>


                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </header>
    );
}

export default Header;

