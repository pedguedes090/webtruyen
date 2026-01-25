import { useState, useEffect, useRef } from 'react';
import {
    FolderOutlined,
    FolderOpenOutlined,
    FileImageOutlined,
    ArrowLeftOutlined,
    DeleteOutlined,
    EditOutlined,
    UploadOutlined,
    PlusOutlined,
    ReloadOutlined,
    EyeOutlined,
    CloseOutlined,
    CheckOutlined,
    LoadingOutlined,
    HomeOutlined
} from '@ant-design/icons';
import {
    browseImages,
    deleteImage,
    deleteFolder,
    renameItem,
    uploadToFolder,
    createFolder,
    getImageServerUrl,
    getImageServerStats,
    getUserAuthHeader // Import helper
} from '../api';

function ImageManager({ onClose }) {
    const [currentPath, setCurrentPath] = useState('/');
    const [folders, setFolders] = useState([]);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState([]);
    const [previewImage, setPreviewImage] = useState(null);
    const [renaming, setRenaming] = useState(null);
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [stats, setStats] = useState(null);
    const [toast, setToast] = useState(null);
    const [dragOver, setDragOver] = useState(false);

    const fileInputRef = useRef(null);
    const IMAGE_SERVER = getImageServerUrl();

    useEffect(() => {
        loadFolder(currentPath);
        loadStats();
    }, [currentPath]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const loadFolder = async (path) => {
        setLoading(true);
        setSelectedItems([]);
        try {
            const data = await browseImages(path, { headers: getUserAuthHeader() });
            setFolders(data.folders || []);
            setFiles(data.files || []);
        } catch (error) {
            showToast('Lỗi tải thư mục: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const data = await getImageServerStats({ headers: getUserAuthHeader() });
            setStats(data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const navigateTo = (path) => {
        setCurrentPath(path);
    };

    const goBack = () => {
        const parts = currentPath.split('/').filter(Boolean);
        if (parts.length > 0) {
            parts.pop();
            navigateTo('/' + parts.join('/'));
        }
    };

    const toggleSelect = (item) => {
        const key = item.path;
        if (selectedItems.includes(key)) {
            setSelectedItems(selectedItems.filter(k => k !== key));
        } else {
            setSelectedItems([...selectedItems, key]);
        }
    };

    const handleDelete = async () => {
        if (selectedItems.length === 0) return;
        if (!window.confirm(`Xóa ${selectedItems.length} mục đã chọn?`)) return;

        setLoading(true);
        try {
            for (const itemPath of selectedItems) {
                const item = [...folders, ...files].find(i => i.path === itemPath);
                if (item?.type === 'folder') {
                    await deleteFolder(itemPath, { headers: getUserAuthHeader() });
                } else {
                    await deleteImage(itemPath, { headers: getUserAuthHeader() });
                }
            }
            showToast(`Đã xóa ${selectedItems.length} mục`);
            loadFolder(currentPath);
            loadStats();
        } catch (error) {
            showToast('Lỗi xóa: ' + error.message, 'error');
            setLoading(false);
        }
    };

    const startRename = (item) => {
        setRenaming(item.path);
        setNewName(item.name);
    };

    const handleRename = async () => {
        if (!renaming || !newName.trim()) return;

        try {
            await renameItem(renaming, newName.trim(), { headers: getUserAuthHeader() });
            showToast('Đã đổi tên thành công');
            setRenaming(null);
            loadFolder(currentPath);
        } catch (error) {
            showToast('Lỗi đổi tên: ' + error.message, 'error');
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;

        try {
            const folderPath = currentPath === '/'
                ? `/${newFolderName.trim()}`
                : `${currentPath}/${newFolderName.trim()}`;
            await createFolder(folderPath, { headers: getUserAuthHeader() });
            showToast('Đã tạo thư mục');
            setCreating(false);
            setNewFolderName('');
            loadFolder(currentPath);
        } catch (error) {
            showToast('Lỗi tạo thư mục: ' + error.message, 'error');
        }
    };

    const handleUpload = async (fileList) => {
        if (!fileList || fileList.length === 0) return;

        setUploading(true);
        setUploadProgress(0);
        try {
            await uploadToFolder(Array.from(fileList), currentPath, setUploadProgress, { headers: getUserAuthHeader() });
            showToast(`Đã upload ${fileList.length} file`);
            loadFolder(currentPath);
            loadStats();
        } catch (error) {
            showToast('Lỗi upload: ' + error.message, 'error');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) {
            handleUpload(files);
        }
    };

    // Breadcrumb
    const pathParts = currentPath.split('/').filter(Boolean);
    const breadcrumbs = [
        { name: 'Root', path: '/' },
        ...pathParts.map((part, idx) => ({
            name: part,
            path: '/' + pathParts.slice(0, idx + 1).join('/')
        }))
    ];

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-card w-full max-w-5xl max-h-[90vh] rounded-lg shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-secondary">
                    <div className="flex items-center gap-3">
                        <FolderOpenOutlined className="text-primary text-xl" />
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Quản lý ảnh</h2>
                        {stats && (
                            <span className="text-xs text-gray-500 bg-gray-200 dark:bg-dark-tertiary px-2 py-1 rounded">
                                Tổng: {stats.total?.sizeFormatted}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-white">
                        <CloseOutlined />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-dark-border">
                    <button
                        onClick={goBack}
                        disabled={currentPath === '/'}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-tertiary rounded disabled:opacity-30"
                        title="Quay lại"
                    >
                        <ArrowLeftOutlined />
                    </button>
                    <button
                        onClick={() => loadFolder(currentPath)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-tertiary rounded"
                        title="Làm mới"
                    >
                        <ReloadOutlined />
                    </button>

                    <div className="h-4 w-px bg-gray-300 dark:bg-dark-border mx-1" />

                    {/* Breadcrumb */}
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 flex-1 overflow-x-auto">
                        {breadcrumbs.map((crumb, idx) => (
                            <span key={crumb.path} className="flex items-center">
                                {idx > 0 && <span className="mx-1 text-gray-400">/</span>}
                                <button
                                    onClick={() => navigateTo(crumb.path)}
                                    className={`hover:text-primary ${idx === breadcrumbs.length - 1 ? 'font-medium text-gray-800 dark:text-white' : ''}`}
                                >
                                    {idx === 0 ? <HomeOutlined /> : crumb.name}
                                </button>
                            </span>
                        ))}
                    </div>

                    <div className="h-4 w-px bg-gray-300 dark:bg-dark-border mx-1" />

                    {selectedItems.length > 0 && (
                        <button
                            onClick={handleDelete}
                            className="px-3 py-1.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 rounded flex items-center gap-1"
                        >
                            <DeleteOutlined /> Xóa ({selectedItems.length})
                        </button>
                    )}

                    <button
                        onClick={() => setCreating(true)}
                        className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-dark-tertiary text-gray-700 dark:text-gray-300 hover:bg-gray-300 rounded flex items-center gap-1"
                    >
                        <PlusOutlined /> Thư mục
                    </button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleUpload(e.target.files)}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="px-3 py-1.5 text-xs bg-primary text-white hover:bg-primary-hover rounded flex items-center gap-1 disabled:opacity-50"
                    >
                        {uploading ? <LoadingOutlined className="animate-spin" /> : <UploadOutlined />}
                        {uploading ? `${uploadProgress}%` : 'Upload'}
                    </button>
                </div>

                {/* Create folder dialog */}
                {creating && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-dark-border flex items-center gap-2">
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                            placeholder="Tên thư mục mới..."
                            className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-dark-tertiary border border-gray-200 dark:border-dark-border rounded outline-none focus:border-primary"
                            autoFocus
                        />
                        <button onClick={handleCreateFolder} className="p-1.5 text-green-600 hover:bg-green-100 rounded">
                            <CheckOutlined />
                        </button>
                        <button onClick={() => { setCreating(false); setNewFolderName(''); }} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded">
                            <CloseOutlined />
                        </button>
                    </div>
                )}

                {/* Content */}
                <div
                    className={`flex-1 overflow-y-auto p-4 ${dragOver ? 'bg-primary/10' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                >
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <LoadingOutlined className="text-3xl text-primary animate-spin" />
                        </div>
                    ) : folders.length === 0 && files.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                            <FolderOutlined className="text-4xl mb-2" />
                            <p>Thư mục trống</p>
                            <p className="text-xs mt-1">Kéo thả ảnh vào đây để upload</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Folders */}
                            {folders.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Thư mục ({folders.length})</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                        {folders.map(folder => (
                                            <div
                                                key={folder.path}
                                                className={`group relative p-3 rounded border cursor-pointer transition-all ${selectedItems.includes(folder.path)
                                                    ? 'bg-primary/10 border-primary'
                                                    : 'bg-gray-50 dark:bg-dark-secondary border-gray-200 dark:border-dark-border hover:border-primary/50'
                                                    }`}
                                                onClick={() => navigateTo(folder.path)}
                                            >
                                                <div className="flex flex-col items-center">
                                                    <FolderOutlined className="text-3xl text-yellow-500 mb-1" />
                                                    {renaming === folder.path ? (
                                                        <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                                                            <input
                                                                type="text"
                                                                value={newName}
                                                                onChange={(e) => setNewName(e.target.value)}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                                                                className="w-full px-1 py-0.5 text-xs bg-white dark:bg-dark-tertiary border rounded"
                                                                autoFocus
                                                            />
                                                            <button onClick={handleRename} className="text-green-600"><CheckOutlined /></button>
                                                            <button onClick={() => setRenaming(null)} className="text-gray-400"><CloseOutlined /></button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-700 dark:text-gray-300 text-center truncate w-full">{folder.name}</span>
                                                    )}
                                                    {folder.childCount !== undefined && (
                                                        <span className="text-[10px] text-gray-400">{folder.childCount} mục</span>
                                                    )}
                                                </div>
                                                {/* Actions */}
                                                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => toggleSelect(folder)}
                                                        className={`p-1 rounded text-xs ${selectedItems.includes(folder.path) ? 'bg-primary text-white' : 'bg-white dark:bg-dark-tertiary text-gray-600 hover:text-primary'}`}
                                                    >
                                                        <CheckOutlined />
                                                    </button>
                                                    <button onClick={() => startRename(folder)} className="p-1 bg-white dark:bg-dark-tertiary text-gray-600 hover:text-primary rounded">
                                                        <EditOutlined />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Files */}
                            {files.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Ảnh ({files.length})</h3>
                                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2">
                                        {files.map(file => (
                                            <div
                                                key={file.path}
                                                className={`group relative aspect-square rounded border overflow-hidden cursor-pointer transition-all ${selectedItems.includes(file.path)
                                                    ? 'ring-2 ring-primary'
                                                    : 'border-gray-200 dark:border-dark-border hover:border-primary/50'
                                                    }`}
                                                onClick={() => toggleSelect(file)}
                                            >
                                                <img
                                                    src={`${IMAGE_SERVER}${file.url}`}
                                                    alt={file.name}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                                {/* Overlay */}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setPreviewImage(file); }}
                                                        className="p-2 bg-white/90 rounded-full text-gray-700 hover:bg-white"
                                                    >
                                                        <EyeOutlined />
                                                    </button>
                                                </div>
                                                {/* Selection indicator */}
                                                {selectedItems.includes(file.path) && (
                                                    <div className="absolute top-1 left-1 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-xs">
                                                        <CheckOutlined />
                                                    </div>
                                                )}
                                                {/* File info */}
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate">
                                                    {file.name}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {dragOver && (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/20 border-4 border-dashed border-primary rounded-lg pointer-events-none">
                            <div className="text-primary text-lg font-medium">Thả ảnh để upload</div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-secondary text-xs text-gray-500 flex items-center justify-between">
                    <span>{folders.length} thư mục, {files.length} ảnh</span>
                    {stats && (
                        <span>Covers: {stats.covers?.sizeFormatted} | Chapters: {stats.chapters?.sizeFormatted}</span>
                    )}
                </div>

                {/* Toast */}
                {toast && (
                    <div className={`absolute bottom-16 right-4 px-4 py-2 text-sm rounded shadow-lg ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'} text-white`}>
                        {toast.message}
                    </div>
                )}

                {/* Image Preview Modal */}
                {previewImage && (
                    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
                        <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                            <img
                                src={`${IMAGE_SERVER}${previewImage.url}`}
                                alt={previewImage.name}
                                className="max-w-full max-h-[80vh] object-contain rounded"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-3 rounded-b">
                                <p className="font-medium">{previewImage.name}</p>
                                <p className="text-sm text-gray-300">{previewImage.sizeFormatted}</p>
                            </div>
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="absolute top-2 right-2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
                            >
                                <CloseOutlined />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ImageManager;
