import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HistoryOutlined, DeleteOutlined, CloseOutlined } from '@ant-design/icons';
import { PLACEHOLDER_SMALL } from '../constants/placeholders';
import { formatTimeAgo } from '../utils/formatters';
import { resolveImageUrl } from '../api';

function HistoryPage() {
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('readingHistory') || '[]');
        setHistory(saved);
    }, []);



    function clearHistory() {
        if (window.confirm('Xóa toàn bộ lịch sử đọc?')) {
            localStorage.removeItem('readingHistory');
            setHistory([]);
        }
    }

    function removeItem(comicId) {
        const updated = history.filter(h => h.comicId !== comicId);
        localStorage.setItem('readingHistory', JSON.stringify(updated));
        setHistory(updated);
    }

    return (
        <main className="max-w-7xl mx-auto px-4 py-6">
            <div className="bg-white dark:bg-dark-card p-4 shadow-sm dark:shadow-none">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <HistoryOutlined className="text-primary text-lg" />
                        <h1 className="text-base font-semibold text-primary">Lịch sử đọc truyện</h1>
                        <span className="text-xs text-gray-500">({history.length} truyện)</span>
                    </div>
                    {history.length > 0 && (
                        <button
                            onClick={clearHistory}
                            className="px-3 py-1 text-xs bg-gray-200 dark:bg-dark-tertiary text-gray-600 dark:text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1"
                        >
                            <DeleteOutlined /> Xóa tất cả
                        </button>
                    )}
                </div>

                {history.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-gray-400 mb-2">Chưa có lịch sử đọc truyện</p>
                        <Link to="/" className="text-sm text-primary hover:underline">Khám phá truyện mới →</Link>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {history.map((item) => (
                            <div key={item.comicId} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-dark-secondary hover:bg-gray-100 dark:hover:bg-dark-tertiary transition-colors group">
                                {/* Cover */}
                                <Link to={`/truyen/${item.comicSlug}`} className="flex-shrink-0">
                                    <img
                                        src={resolveImageUrl(item.coverUrl) || PLACEHOLDER_SMALL}
                                        alt={item.comicTitle}
                                        className="w-12 h-16 object-cover"
                                    />
                                </Link>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <Link to={`/truyen/${item.comicSlug}`}>
                                        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 hover:text-primary transition-colors truncate">
                                            {item.comicTitle}
                                        </h3>
                                    </Link>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Link
                                            to={`/truyen/${item.comicSlug}/chuong/${item.chapterNumber}`}
                                            className="text-xs text-gray-600 dark:text-gray-400 hover:text-primary"
                                        >
                                            Đọc tiếp Chương {item.chapterNumber} →
                                        </Link>
                                        <span className="text-[10px] text-gray-600">• {formatTimeAgo(item.timestamp)}</span>
                                    </div>
                                </div>

                                {/* Remove button */}
                                <button
                                    onClick={() => removeItem(item.comicId)}
                                    className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                    title="Xóa khỏi lịch sử"
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

export default HistoryPage;
