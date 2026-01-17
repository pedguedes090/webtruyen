import { useState, useEffect, useRef, useCallback } from 'react';
import {
    adminLogin,
    adminLogout,
    isAdminLoggedIn,
    getComics,
    getChapters,
    createComic,
    updateComic,
    deleteComic,
    createChapter,
    updateChapter,
    deleteChapter,
    fetchHuggingFaceImages,
    uploadCoverImage,
    uploadChapterImages,
    getImageServerUrl,
    resolveImageUrl,
    slugify
} from '../api';
import {
    BookOutlined,
    LogoutOutlined,
    EditOutlined,
    DeleteOutlined,
    PlusOutlined,
    FileAddOutlined,
    CloudDownloadOutlined,
    SaveOutlined,
    CloseOutlined,
    LockOutlined,
    UserOutlined,
    UploadOutlined,
    PictureOutlined,
    LoadingOutlined,
    FolderOpenOutlined,
    SearchOutlined,
    LeftOutlined,
    RightOutlined
} from '@ant-design/icons';
import ImageManager from '../components/ImageManager';
import { PLACEHOLDER_THUMB } from '../constants/placeholders';

function AdminPage() {
    const [isLoggedIn, setIsLoggedIn] = useState(isAdminLoggedIn());
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    const [comics, setComics] = useState([]);
    const [totalComics, setTotalComics] = useState(0);
    const [selectedComic, setSelectedComic] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // Search and pagination state
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const COMICS_PER_PAGE = 10;

    const [comicForm, setComicForm] = useState({
        title: '', description: '', cover_url: '', author: '', status: 'ongoing', genres: ''
    });
    const [editingComic, setEditingComic] = useState(null);

    const [chapterForm, setChapterForm] = useState({
        chapter_number: '', title: ''
    });
    const [editingChapter, setEditingChapter] = useState(null);

    // Multi-server state
    const [servers, setServers] = useState([
        { id: 'default', name: 'Server VIP', type: 'url', content: '', files: [], hfUrl: '', fetching: false }
    ]);

    // Upload states
    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [showImageManager, setShowImageManager] = useState(false);

    const coverInputRef = useRef(null);
    // Refs for server file inputs map
    const serverFileInputRefs = useRef({});

    // Define fetchComics first (before useEffects that use it)
    const fetchComics = useCallback(async (page = 1, search = '') => {
        setLoading(true);
        try {
            const offset = (page - 1) * COMICS_PER_PAGE;
            const response = await getComics(COMICS_PER_PAGE, offset, search);
            setComics(response.data);
            setTotalComics(response.total || 0);
        } catch (error) {
            showToast('Lỗi tải danh sách truyện', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    // Handle page change
    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        fetchComics(newPage, searchQuery);
    };

    const totalPages = Math.ceil(totalComics / COMICS_PER_PAGE);

    // Load comics when logged in
    useEffect(() => {
        if (isLoggedIn) fetchComics(1, '');
    }, [isLoggedIn, fetchComics]);

    useEffect(() => {
        if (selectedComic?.id) fetchChapters(selectedComic.id);
    }, [selectedComic?.id]);

    // Clean up cover preview URL
    useEffect(() => {
        return () => {
            if (coverPreview) URL.revokeObjectURL(coverPreview);
        };
    }, [coverPreview]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
            fetchComics(1, searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, fetchComics]);

    const fetchChapters = async (comicId) => {
        try {
            const data = await getChapters(comicId);
            setChapters(data);
        } catch (error) {
            showToast('Lỗi tải danh sách chương', 'error');
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        const success = await adminLogin(username, password);
        if (success) {
            setIsLoggedIn(true);
            setUsername('');
            setPassword('');
        } else {
            setLoginError('Sai tên đăng nhập hoặc mật khẩu');
        }
    };

    const handleLogout = () => {
        adminLogout();
        setIsLoggedIn(false);
        setComics([]);
        setSelectedComic(null);
        setChapters([]);
    };



    // Handle cover file selection
    const handleCoverSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setCoverFile(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    // Handle chapter files selection
    // Handle server changes
    const handleServerChange = (id, field, value) => {
        setServers(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleAddServer = () => {
        setServers(prev => [
            ...prev,
            { id: Date.now(), name: `Server ${prev.length + 1}`, type: 'url', content: '', files: [], hfUrl: '', fetching: false }
        ]);
    };

    const handleRemoveServer = (id) => {
        if (servers.length > 1) {
            setServers(prev => prev.filter(s => s.id !== id));
        }
    };

    const handleServerFilesSelect = (e, id) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            handleServerChange(id, 'files', files);
            // Auto-switch type validation if needed
        }
    };

    const handleFetchHfImages = async (id) => {
        const server = servers.find(s => s.id === id);
        if (!server || !server.hfUrl.trim()) {
            showToast('Nhập link folder', 'error');
            return;
        }

        handleServerChange(id, 'fetching', true);
        try {
            const result = await fetchHuggingFaceImages(server.hfUrl.trim());
            if (result.image_urls?.length > 0) {
                setServers(prev => prev.map(s => s.id === id ? {
                    ...s,
                    content: result.image_urls.join('\n'),
                    type: 'url', // Switch to url mode to show result
                    fetching: false,
                    hfUrl: ''
                } : s));
                showToast(`Tìm thấy ${result.count} ảnh`);
            } else {
                showToast('Không tìm thấy ảnh', 'error');
                handleServerChange(id, 'fetching', false);
            }
        } catch (error) {
            showToast('Lỗi: ' + (error.response?.data?.error || error.message), 'error');
            handleServerChange(id, 'fetching', false);
        }
    };

    const handleComicSubmit = async (e) => {
        e.preventDefault();
        try {
            const genres = comicForm.genres.split(',').map(g => g.trim()).filter(g => g);
            let coverUrl = comicForm.cover_url;

            // Upload cover if file selected
            if (coverFile && comicForm.title) {
                setUploading(true);
                setUploadProgress(0);
                try {
                    const result = await uploadCoverImage(
                        coverFile,
                        slugify(comicForm.title),
                        setUploadProgress
                    );
                    // Only save relative path to database (not full URL)
                    coverUrl = result.url;
                } catch (err) {
                    showToast('Lỗi upload ảnh bìa: ' + err.message, 'error');
                    setUploading(false);
                    return;
                }
                setUploading(false);
            }

            const comicData = { ...comicForm, cover_url: coverUrl, genres };

            if (editingComic) {
                const updated = await updateComic(editingComic.id, comicData);
                // Optimally update local state
                setComics(prev => prev.map(c => c.id === updated.id ? updated : c));
                // If the currently selected comic was updated, update it too
                if (selectedComic?.id === updated.id) {
                    setSelectedComic(updated);
                }
                showToast('Cập nhật truyện thành công!');
            } else {
                const created = await createComic(comicData);
                setComics(prev => [created, ...prev]);
                showToast('Thêm truyện thành công!');
            }
            setEditingComic(null);
            setComicForm({ title: '', author: '', description: '', cover_url: '', genres: [], status: 'ongoing' });
            setCoverFile(null);
            setCoverPreview(null);
        } catch (error) {
            console.error('Error submitting comic:', error);
            showToast('Lỗi lưu truyện: ' + error.message, 'error');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleEditComic = (comic) => {
        setEditingComic(comic);
        setComicForm({
            title: comic.title,
            description: comic.description || '',
            cover_url: comic.cover_url || '',
            author: comic.author || '',
            status: comic.status || 'ongoing',
            genres: comic.genres ? comic.genres.join(', ') : ''
        });
        setCoverFile(null);
        setCoverPreview(null);
    };

    const handleDeleteComic = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa truyện này?')) return;
        try {
            await deleteComic(id);
            setComics(prev => prev.filter(c => c.id !== id));
            if (selectedComic?.id === id) {
                setSelectedComic(null);
                setChapters([]);
            }
            showToast('Xóa truyện thành công!');
        } catch (error) {
            console.error('Error deleting comic:', error);
            showToast('Lỗi xóa truyện: ' + error.message, 'error');
        }
    };

    const handleChapterSubmit = async (e) => {
        e.preventDefault();
        if (!selectedComic) {
            showToast('Chọn truyện trước', 'error');
            return;
        }

        try {
            const chapterData = {
                comic_id: selectedComic.id,
                chapter_number: parseFloat(chapterForm.chapter_number),
                title: chapterForm.title
            };

            const processedServers = [];

            for (const server of servers) {
                let imageUrls = [];

                if (server.type === 'upload' && server.files.length > 0) {
                    setUploading(true);
                    setUploadProgress(0);
                    try {
                        // Use original uploadChapterImages but note it puts all in same folder
                        // If user uploads different files for different "servers" they might overwrite
                        // if filenames are same. This is a limitation of current backend upload structure.
                        // Assuming "upload" is only used for one server usually.
                        const result = await uploadChapterImages(
                            server.files,
                            slugify(selectedComic.title),
                            chapterForm.chapter_number,
                            setUploadProgress
                        );
                        imageUrls = result.urls;
                    } catch (err) {
                        showToast(`Lỗi upload server ${server.name}: ` + err.message, 'error');
                        setUploading(false);
                        return;
                    }
                    setUploading(false);
                } else {
                    imageUrls = server.content.split(/[\n,]/).map(url => url.trim()).filter(url => url);
                }

                if (imageUrls.length > 0) {
                    processedServers.push({
                        server_name: server.name,
                        image_urls: imageUrls
                    });
                }
            }

            if (processedServers.length === 0) {
                showToast('Chưa có ảnh nào được nhập/chọn!', 'error');
                return;
            }

            let resultChapter;
            if (editingChapter) {
                resultChapter = await updateChapter(editingChapter.id, {
                    ...chapterData,
                    image_urls: processedServers
                });
                setChapters(prev => prev.map(c => c.id === resultChapter.id ? resultChapter : c));
                showToast('Cập nhật chương thành công!');
            } else {
                resultChapter = await createChapter({
                    ...chapterData,
                    image_urls: processedServers
                });
                setChapters(prev => [...prev, resultChapter]);
                showToast('Thêm chương thành công!');
            }

            // Reset form
            setEditingChapter(null);
            setChapterForm({ chapter_number: '', title: '' });
            setServers([{ id: Date.now(), name: 'Server VIP', type: 'url', content: '', files: [], hfUrl: '', fetching: false }]);
            setUploadProgress(0);
        } catch (error) {
            console.error('Error submitting chapter:', error);
            showToast('Lỗi lưu chương: ' + error.message, 'error');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleEditChapter = (chapter) => {
        setEditingChapter(chapter);
        setChapterForm({
            chapter_number: chapter.chapter_number,
            title: chapter.title || ''
        });

        // Parse existing image_urls to populate servers
        try {
            if (chapter.image_urls && Array.isArray(chapter.image_urls) && chapter.image_urls.length > 0 && typeof chapter.image_urls[0] === 'object') {
                // New format: array of { server_name, image_urls }
                const formattedServers = chapter.image_urls.map((s, idx) => ({
                    id: Date.now() + idx,
                    name: s.server_name,
                    type: 'url', // Default to 'url' view for editing existing data
                    content: s.image_urls.join('\n'),
                    files: [],
                    hfUrl: '',
                    fetching: false
                }));
                setServers(formattedServers);
            } else {
                // Legacy format: array of strings or empty
                const urls = Array.isArray(chapter.image_urls) ? chapter.image_urls : [];
                setServers([{
                    id: Date.now(),
                    name: 'Server Chính',
                    type: 'url',
                    content: urls.join('\n'),
                    files: [],
                    hfUrl: '',
                    fetching: false
                }]);
            }
        } catch (e) {
            console.error("Error parsing chapter images for edit", e);
            // Fallback
            setServers([{ id: Date.now(), name: 'Server 1', type: 'url', content: '', files: [], hfUrl: '', fetching: false }]);
        }
    };

    const handleDeleteChapter = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa chương này?')) return;
        try {
            await deleteChapter(id);
            setChapters(prev => prev.filter(c => c.id !== id));
            showToast('Xóa chương thành công!');
            if (editingChapter?.id === id) {
                setEditingChapter(null);
                setChapterForm({ chapter_number: '', title: '' });
                setServers([{ id: Date.now(), name: 'Server VIP', type: 'url', content: '', files: [], hfUrl: '', fetching: false }]);
            }
        } catch (error) {
            console.error('Error deleting chapter:', error);
            showToast('Lỗi xóa chương: ' + error.message, 'error');
        }
    };

    // Login
    if (!isLoggedIn) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-6 bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
                <div className="w-full max-w-sm bg-white dark:bg-dark-card p-6 rounded-lg shadow-md border border-gray-200 dark:border-dark-border">
                    <h1 className="text-lg font-bold text-primary mb-4 text-center flex items-center justify-center gap-2">
                        <LockOutlined /> Admin Panel
                    </h1>
                    <form onSubmit={handleLogin} className="space-y-3">
                        <div className="relative">
                            <UserOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border rounded text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Tên đăng nhập"
                                required
                            />
                        </div>
                        <div className="relative">
                            <LockOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="password"
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border rounded text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mật khẩu"
                                required
                            />
                        </div>
                        {loginError && <p className="text-red-500 text-xs text-center">{loginError}</p>}
                        <button type="submit" className="w-full px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-hover rounded transition-colors flex items-center justify-center gap-2">
                            Đăng nhập
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Dashboard
    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 px-4 py-2 text-sm z-50 rounded shadow-lg ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'} text-white`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-4 bg-white dark:bg-dark-card p-4 rounded-lg shadow-sm border border-gray-100 dark:border-dark-border">
                <div className="flex items-center gap-2">
                    <BookOutlined className="text-primary text-xl" />
                    <h1 className="text-lg font-bold text-primary">Quản lý truyện</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowImageManager(true)}
                        className="px-3 py-1.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 rounded transition-colors flex items-center gap-1"
                    >
                        <FolderOpenOutlined /> Quản lý ảnh
                    </button>
                    <button onClick={handleLogout} className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-dark-tertiary text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors flex items-center gap-1">
                        <LogoutOutlined /> Đăng xuất
                    </button>
                </div>
            </div>

            {/* Image Manager Modal */}
            {showImageManager && <ImageManager onClose={() => setShowImageManager(false)} />}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Comic Form */}
                <div className="bg-white dark:bg-dark-card p-4 rounded-lg shadow-sm border border-gray-100 dark:border-dark-border">
                    <h2 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                        {editingComic ? <EditOutlined /> : <PlusOutlined />}
                        {editingComic ? 'Sửa truyện' : 'Thêm truyện mới'}
                    </h2>
                    <form onSubmit={handleComicSubmit} className="space-y-3">
                        <input
                            type="text"
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border rounded text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-primary transition-all"
                            placeholder="Tên truyện *"
                            value={comicForm.title}
                            onChange={(e) => setComicForm({ ...comicForm, title: e.target.value })}
                            required
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border rounded text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-primary transition-all"
                                placeholder="Tác giả"
                                value={comicForm.author}
                                onChange={(e) => setComicForm({ ...comicForm, author: e.target.value })}
                            />
                            <select
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border rounded text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-primary transition-all"
                                value={comicForm.status}
                                onChange={(e) => setComicForm({ ...comicForm, status: e.target.value })}
                            >
                                <option value="ongoing">Đang tiến hành</option>
                                <option value="completed">Hoàn thành</option>
                            </select>
                        </div>

                        {/* Cover Image Section */}
                        <div className="p-3 bg-gray-50 dark:bg-dark-secondary rounded border border-gray-100 dark:border-dark-border">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block uppercase">
                                Ảnh bìa
                            </label>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <input
                                        type="url"
                                        className="w-full px-3 py-2 bg-white dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border rounded text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-primary transition-all"
                                        placeholder="URL ảnh bìa hoặc upload bên dưới"
                                        value={comicForm.cover_url}
                                        onChange={(e) => setComicForm({ ...comicForm, cover_url: e.target.value })}
                                        disabled={!!coverFile}
                                    />
                                    <div className="mt-2 flex gap-2">
                                        <input
                                            ref={coverInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleCoverSelect}
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => coverInputRef.current?.click()}
                                            className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-dark-tertiary text-gray-700 dark:text-gray-300 hover:bg-primary hover:text-white rounded transition-colors flex items-center gap-1"
                                        >
                                            <UploadOutlined /> Upload ảnh
                                        </button>
                                        {coverFile && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCoverFile(null);
                                                    setCoverPreview(null);
                                                }}
                                                className="px-3 py-1.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 rounded transition-colors"
                                            >
                                                Xóa
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {(coverPreview || comicForm.cover_url) && (
                                    <img
                                        src={coverPreview || comicForm.cover_url}
                                        alt="Preview"
                                        className="w-16 h-20 object-cover rounded border border-gray-200 dark:border-dark-border"
                                    />
                                )}
                            </div>
                            {coverFile && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                                    <PictureOutlined /> {coverFile.name} ({(coverFile.size / 1024).toFixed(1)} KB)
                                </p>
                            )}
                        </div>

                        <textarea
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border rounded text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-primary transition-all resize-y min-h-[80px]"
                            placeholder="Mô tả"
                            value={comicForm.description}
                            onChange={(e) => setComicForm({ ...comicForm, description: e.target.value })}
                        />
                        <input
                            type="text"
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border rounded text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-primary transition-all"
                            placeholder="Thể loại (phân cách bằng dấu phẩy)"
                            value={comicForm.genres}
                            onChange={(e) => setComicForm({ ...comicForm, genres: e.target.value })}
                        />
                        <div className="flex gap-2 pt-2">
                            <button
                                type="submit"
                                disabled={uploading}
                                className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-hover rounded transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {uploading ? <LoadingOutlined className="animate-spin" /> : (editingComic ? <SaveOutlined /> : <PlusOutlined />)}
                                {uploading ? 'Đang upload...' : (editingComic ? 'Cập nhật' : 'Thêm truyện')}
                            </button>
                            {editingComic && (
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-gray-200 dark:bg-dark-tertiary text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-300 dark:hover:bg-dark-secondary rounded transition-colors flex items-center gap-1.5"
                                    onClick={() => {
                                        setEditingComic(null);
                                        setComicForm({ title: '', description: '', cover_url: '', author: '', status: 'ongoing', genres: '' });
                                        setCoverFile(null);
                                        setCoverPreview(null);
                                    }}
                                >
                                    <CloseOutlined /> Hủy
                                </button>
                            )}
                        </div>
                        {uploading && (
                            <div className="w-full bg-gray-200 dark:bg-dark-tertiary rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        )}
                    </form>
                </div>

                {/* Comic List */}
                <div className="bg-white dark:bg-dark-card p-4 rounded-lg shadow-sm border border-gray-100 dark:border-dark-border flex flex-col h-[500px]">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
                            <BookOutlined /> Danh sách truyện ({totalComics})
                        </h2>
                    </div>

                    {/* Search Box */}
                    <div className="relative mb-3">
                        <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border rounded text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                            placeholder="Tìm kiếm truyện..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <CloseOutlined />
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex-1 flex justify-center items-center">
                            <div className="w-8 h-8 border-4 border-gray-200 dark:border-dark-tertiary border-t-primary rounded-full animate-spin" />
                        </div>
                    ) : comics.length === 0 ? (
                        <div className="flex-1 flex flex-col justify-center items-center text-gray-400">
                            <BookOutlined className="text-3xl mb-2 opacity-50" />
                            <p className="text-sm">{searchQuery ? 'Không tìm thấy truyện nào' : 'Chưa có truyện nào'}</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {comics.map(comic => (
                                    <div
                                        key={comic.id}
                                        className={`flex items-center gap-3 p-2 rounded border transition-all cursor-pointer ${selectedComic?.id === comic.id
                                            ? 'bg-primary/10 border-primary shadow-sm'
                                            : 'bg-gray-50 dark:bg-dark-secondary border-gray-100 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-tertiary'
                                            }`}
                                        onClick={() => setSelectedComic(comic)}
                                    >
                                        <img
                                            src={resolveImageUrl(comic.cover_url) || PLACEHOLDER_THUMB}
                                            alt=""
                                            className="w-10 h-14 object-cover rounded shadow-sm bg-gray-200 dark:bg-gray-700"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{comic.title}</div>
                                            <div className="text-xs text-gray-500 truncate">{comic.author || 'Chưa rõ tác giả'}</div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                                onClick={(e) => { e.stopPropagation(); handleEditComic(comic); }}
                                                title="Sửa"
                                            >
                                                <EditOutlined />
                                            </button>
                                            <button
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteComic(comic.id); }}
                                                title="Xóa"
                                            >
                                                <DeleteOutlined />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 dark:border-dark-border">
                                    <span className="text-xs text-gray-500">
                                        Trang {currentPage}/{totalPages}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <LeftOutlined />
                                        </button>

                                        {/* Page numbers */}
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let page;
                                            if (totalPages <= 5) {
                                                page = i + 1;
                                            } else if (currentPage <= 3) {
                                                page = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                page = totalPages - 4 + i;
                                            } else {
                                                page = currentPage - 2 + i;
                                            }
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => handlePageChange(page)}
                                                    className={`min-w-[28px] h-7 text-xs rounded transition-colors ${currentPage === page
                                                        ? 'bg-primary text-white'
                                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-tertiary'
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        })}

                                        <button
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <RightOutlined />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Chapter Form */}
                <div className="bg-white dark:bg-dark-card p-4 rounded-lg shadow-sm border border-gray-100 dark:border-dark-border">
                    <h2 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                        {editingChapter ? <EditOutlined /> : <FileAddOutlined />}
                        {editingChapter ? 'Sửa chương' : 'Thêm chương mới'}
                        {selectedComic && <span className="font-normal text-gray-500">- {selectedComic.title}</span>}
                    </h2>
                    {!selectedComic ? (
                        <div className="py-8 text-center border-2 border-dashed border-gray-200 dark:border-dark-border rounded text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-dark-secondary/30">
                            <BookOutlined className="text-2xl mb-2 opacity-50" />
                            <p className="text-xs">Vui lòng chọn một truyện từ danh sách bên phải</p>
                        </div>
                    ) : (
                        <form onSubmit={handleChapterSubmit} className="space-y-4">
                            <div className="flex gap-3">
                                <div className="w-24">
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border rounded text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-primary transition-all"
                                        placeholder="Số *"
                                        value={chapterForm.chapter_number}
                                        onChange={(e) => setChapterForm({ ...chapterForm, chapter_number: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border rounded text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-primary transition-all"
                                        placeholder="Tiêu đề chương (tùy chọn)"
                                        value={chapterForm.title}
                                        onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {servers.map((server, index) => (
                                    <div key={server.id} className="p-3 bg-gray-50 dark:bg-dark-secondary rounded border border-gray-200 dark:border-dark-border relative group">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 flex-1">
                                                <span className="text-xs font-bold text-gray-500 bg-gray-200 dark:bg-dark-tertiary px-2 py-0.5 rounded">
                                                    #{index + 1}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={server.name}
                                                    onChange={(e) => handleServerChange(server.id, 'name', e.target.value)}
                                                    className="bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 outline-none text-sm font-medium w-32 focus:border-primary"
                                                    placeholder="Tên Server"
                                                />
                                            </div>
                                            {servers.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveServer(server.id)}
                                                    className="text-gray-400 hover:text-red-500 px-2"
                                                    title="Xóa server này"
                                                >
                                                    <CloseOutlined />
                                                </button>
                                            )}
                                        </div>

                                        {/* Tabs */}
                                        <div className="flex gap-1 mb-2">
                                            {[
                                                { k: 'url', l: 'Nhập URL' },
                                                { k: 'upload', l: 'Upload' },
                                                { k: 'huggingface', l: 'HuggingFace' }
                                            ].map(t => (
                                                <button
                                                    key={t.k}
                                                    type="button"
                                                    onClick={() => handleServerChange(server.id, 'type', t.k)}
                                                    className={`px-3 py-1 text-xs rounded transition-colors ${server.type === t.k
                                                        ? 'bg-primary text-white shadow-sm'
                                                        : 'bg-gray-200 dark:bg-dark-tertiary text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-dark-border'
                                                        }`}
                                                >
                                                    {t.l}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Content based on type */}
                                        {server.type === 'url' && (
                                            <textarea
                                                className="w-full px-3 py-2 bg-white dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border rounded text-xs text-gray-800 dark:text-gray-200 outline-none focus:border-primary font-mono min-h-[80px]"
                                                placeholder="Danh sách link ảnh..."
                                                value={server.content}
                                                onChange={(e) => handleServerChange(server.id, 'content', e.target.value)}
                                            />
                                        )}

                                        {server.type === 'upload' && (
                                            <div className="border border-dashed border-gray-300 dark:border-dark-border rounded p-3 text-center bg-white dark:bg-dark-tertiary/50">
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    onChange={(e) => handleServerFilesSelect(e, server.id)}
                                                    className="hidden"
                                                    ref={el => serverFileInputRefs.current[server.id] = el}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => serverFileInputRefs.current[server.id]?.click()}
                                                    className="px-3 py-1.5 bg-gray-100 dark:bg-dark-tertiary hover:bg-white border border-gray-200 dark:border-dark-border rounded text-xs transition-colors"
                                                >
                                                    <UploadOutlined /> Chọn ảnh
                                                </button>
                                                {server.files.length > 0 && (
                                                    <div className="mt-2 text-xs text-left">
                                                        <p className="font-medium text-primary mb-1">Đã chọn {server.files.length} ảnh</p>
                                                        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                                                            {server.files.slice(0, 5).map((f, i) => (
                                                                <span key={i} className="px-1.5 py-0.5 bg-gray-100 dark:bg-dark-border rounded text-[10px] truncate max-w-[100px]">{f.name}</span>
                                                            ))}
                                                            {server.files.length > 5 && <span className="text-[10px] text-gray-500">...</span>}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {server.type === 'huggingface' && (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    className="flex-1 px-3 py-1.5 bg-white dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border rounded text-xs outline-none focus:border-primary"
                                                    placeholder="URL thư mục HF..."
                                                    value={server.hfUrl}
                                                    onChange={(e) => handleServerChange(server.id, 'hfUrl', e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleFetchHfImages(server.id)}
                                                    disabled={server.fetching}
                                                    className="px-3 py-1.5 bg-gray-200 dark:bg-dark-tertiary hover:bg-primary hover:text-white rounded text-xs transition-colors"
                                                >
                                                    {server.fetching ? <LoadingOutlined /> : <CloudDownloadOutlined />}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={handleAddServer}
                                    className="w-full py-2 border border-dashed border-gray-300 dark:border-dark-border rounded text-xs text-gray-500 hover:text-primary hover:border-primary transition-colors flex items-center justify-center gap-1"
                                >
                                    <PlusOutlined /> Thêm Server
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={uploading}
                                className="w-full px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-hover rounded transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                                {uploading ? <LoadingOutlined className="animate-spin" /> : (editingChapter ? <SaveOutlined /> : <PlusOutlined />)}
                                {uploading ? `Đang xử lý... ${uploadProgress}%` : (editingChapter ? 'Cập nhật chương' : 'Lưu chương')}
                            </button>

                            {editingChapter && (
                                <button
                                    type="button"
                                    className="w-full px-4 py-2 bg-gray-200 dark:bg-dark-tertiary text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-300 dark:hover:bg-dark-secondary rounded transition-colors flex items-center justify-center gap-1.5"
                                    onClick={() => {
                                        setEditingChapter(null);
                                        setChapterForm({ chapter_number: '', title: '' });
                                        setServers([{ id: Date.now(), name: 'Server VIP', type: 'url', content: '', files: [], hfUrl: '', fetching: false }]);
                                    }}
                                >
                                    <CloseOutlined /> Hủy sửa
                                </button>
                            )}

                            {uploading && (
                                <div className="w-full bg-gray-200 dark:bg-dark-tertiary rounded-full h-1 mt-2">
                                    <div
                                        className="bg-primary h-1 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            )}
                        </form>
                    )}
                </div>

                {/* Chapter List */}
                <div className="bg-white dark:bg-dark-card p-4 rounded-lg shadow-sm border border-gray-100 dark:border-dark-border h-[500px] flex flex-col">
                    <h2 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                        <BookOutlined /> Danh sách chương {selectedComic && `(${chapters.length})`}
                    </h2>
                    {!selectedComic ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-dark-secondary/30 rounded border-2 border-dashed border-gray-200 dark:border-dark-border">
                            <BookOutlined className="text-2xl mb-2 opacity-50" />
                            <p className="text-xs">Chọn một truyện để xem danh sách chương</p>
                        </div>
                    ) : chapters.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-dark-secondary/30 rounded">
                            <FileAddOutlined className="text-2xl mb-2 opacity-50" />
                            <p className="text-xs">Chưa có chương nào. Hãy thêm chương mới!</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {chapters.map(chapter => (
                                <div key={chapter.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-dark-secondary hover:bg-gray-100 dark:hover:bg-dark-tertiary rounded border border-gray-100 dark:border-dark-border/50 text-xs transition-colors group">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">Chap {chapter.chapter_number}</span>
                                        {chapter.title && <span className="text-gray-500 dark:text-gray-400 truncate border-l border-gray-300 dark:border-gray-600 pl-2 ml-1">{chapter.title}</span>}
                                    </div>
                                    <button
                                        className="text-gray-400 hover:text-primary p-1 rounded opacity-0 group-hover:opacity-100 transition-all mr-1"
                                        onClick={() => handleEditChapter(chapter)}
                                        title="Sửa chương"
                                    >
                                        <EditOutlined />
                                    </button>
                                    <button
                                        className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-all"
                                        onClick={() => handleDeleteChapter(chapter.id)}
                                        title="Xóa chương"
                                    >
                                        <DeleteOutlined />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminPage;
