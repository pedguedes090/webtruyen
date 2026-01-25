import axios from 'axios';

const API_BASE = '/api';
const IMAGE_SERVER_BASE = import.meta.env.VITE_IMAGE_SERVER_URL || 'http://localhost:3002';

// Helper: Generate slug from title (for URLs)
export function slugify(text) {
    return text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Create axios instance with interceptor for auth
const api = axios.create({
    baseURL: API_BASE
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Helper: Get Admin Token Header (Strict)
export function getAdminAuthHeader() {
    const adminToken = localStorage.getItem('adminToken');
    return adminToken ? { Authorization: `Bearer ${adminToken}` } : {};
}

// Helper: Get User Token Header (Strict)
export function getUserAuthHeader() {
    const userToken = localStorage.getItem('authToken');
    return userToken ? { Authorization: `Bearer ${userToken}` } : {};
}

// ============== AUTH API ==============

export const register = async (username, email, password) => {
    const response = await axios.post(`${API_BASE}/auth/register`, { username, email, password });
    return response.data;
};

export const login = async (email, password) => {
    const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
    return response.data;
};

export const getMe = async () => {
    const response = await api.get('/auth/me');
    return response.data;
};

// ============== PUBLIC API ==============

export const getComics = async (limit = 20, offset = 0, search = '', sort = '') => {
    const params = new URLSearchParams({ limit, offset });
    if (search) params.append('search', search);
    if (sort) params.append('sort', sort);
    const response = await axios.get(`${API_BASE}/comics?${params}`);
    // Returns { data: [...], total: number }
    return response.data;
};

export const getMyComics = async (limit = 20, offset = 0, search = '') => {
    const params = new URLSearchParams({ limit, offset });
    if (search) params.append('search', search);
    const response = await axios.get(`${API_BASE}/admin/comics/my?${params}`, {
        headers: getUserAuthHeader() // My Comics is always for the logged-in user (admin or regular)
    });
    return response.data;
};

export const getTopComics = async (limit = 10, offset = 0) => {
    const response = await axios.get(`${API_BASE}/comics/top?limit=${limit}&offset=${offset}`);
    // Returns { data: [...], total: number }
    return response.data;
};

export const getRecentComics = async (limit = 12, offset = 0) => {
    const response = await axios.get(`${API_BASE}/comics/recent?limit=${limit}&offset=${offset}`);
    // Returns { data: [...], total: number }
    return response.data;
};

// Prefetch next page (for performance)
export const prefetchRecentComics = (limit, offset) => {
    // Fire and forget - cache the response
    axios.get(`${API_BASE}/comics/recent?limit=${limit}&offset=${offset}`).catch(() => { });
};

// Get featured comics (random from top views)
export const getFeaturedComics = async (count = 10, fromTop = 30) => {
    const response = await axios.get(`${API_BASE}/comics/featured?count=${count}&fromTop=${fromTop}`);
    return response.data;
};

export const getComic = async (id) => {
    const response = await axios.get(`${API_BASE}/comics/${id}`);
    return response.data;
};

export const getChapters = async (comicId) => {
    const response = await axios.get(`${API_BASE}/comics/${comicId}/chapters`);
    return response.data;
};

export const getChapter = async (id) => {
    const response = await axios.get(`${API_BASE}/chapters/${id}`);
    return response.data;
};

// Get comic by slug (SEO-friendly URL)
export const getComicBySlug = async (slug) => {
    const response = await axios.get(`${API_BASE}/comics/slug/${slug}`);
    return response.data;
};

// Get chapter by comic slug and chapter number (SEO-friendly URL)
export const getChapterBySlugAndNumber = async (slug, chapterNumber) => {
    const response = await axios.get(`${API_BASE}/comics/slug/${slug}/chapter/${chapterNumber}`);
    return response.data;
};

// ============== GENRES API ==============

export const getGenres = async () => {
    const response = await axios.get(`${API_BASE}/genres`);
    return response.data;
};

export const getComicsByGenre = async (genre, limit = 20, offset = 0) => {
    const response = await axios.get(`${API_BASE}/genres/${encodeURIComponent(genre)}/comics?limit=${limit}&offset=${offset}`);
    // Returns { data: [...], total: number }
    return response.data;
};

// ============== ADMIN API ==============

export const adminLogin = async (username, password) => {
    try {
        const response = await axios.post(`${API_BASE}/admin/login`, { username, password });
        if (response.data.success && response.data.token) {
            localStorage.setItem('adminToken', response.data.token);
            return true;
        }
    } catch (error) {
        console.error('Login failed:', error);
    }
    return false;
};

export function adminLogout() {
    localStorage.removeItem('adminToken');
}

export function isAdminLoggedIn() {
    return !!localStorage.getItem('adminToken');
}

export const createComic = async (comic, options = {}) => {
    const headers = options.headers || getAdminAuthHeader();
    const response = await axios.post(`${API_BASE}/admin/comics`, comic, {
        headers
    });
    return response.data;
};

export const updateComic = async (id, comic, options = {}) => {
    const headers = options.headers || getAdminAuthHeader();
    const response = await axios.put(`${API_BASE}/admin/comics/${id}`, comic, {
        headers
    });
    return response.data;
};

export const deleteComic = async (id, options = {}) => {
    const headers = options.headers || getAdminAuthHeader();
    await axios.delete(`${API_BASE}/admin/comics/${id}`, {
        headers
    });
};

export const createChapter = async (chapter, options = {}) => {
    const headers = options.headers || getAdminAuthHeader();
    const response = await axios.post(`${API_BASE}/admin/chapters`, chapter, {
        headers
    });
    return response.data;
};

export const updateChapter = async (id, chapter, options = {}) => {
    const headers = options.headers || getAdminAuthHeader();
    const response = await axios.put(`${API_BASE}/admin/chapters/${id}`, chapter, {
        headers
    });
    return response.data;
};

export const deleteChapter = async (id, options = {}) => {
    const headers = options.headers || getAdminAuthHeader();
    await axios.delete(`${API_BASE}/admin/chapters/${id}`, {
        headers
    });
};

// Fetch images from HuggingFace folder URL
export const fetchHuggingFaceImages = async (folderUrl) => {
    const response = await axios.post(`${API_BASE}/huggingface/fetch-images`, {
        folder_url: folderUrl
    });
    return response.data;
};

// Get TikTok image base URL from server config
export const getTikTokBaseUrl = async () => {
    const response = await axios.get(`${API_BASE}/config/tiktok-base-url`);
    return response.data.baseUrl;
};

// ============== IMAGE SERVER API ==============

// Get image server base URL (for displaying images)
export function getImageServerUrl() {
    return IMAGE_SERVER_BASE;
}

// Resolve image URL - adds Image Server base for relative paths
// Relative paths (starting with /images/) are from our Image Server
// Full URLs (http/https) are from external sources (HuggingFace, etc.)
export function resolveImageUrl(url) {
    if (!url) return '';
    // If it's a relative path from our image server
    if (url.startsWith('/images/')) {
        return `${IMAGE_SERVER_BASE}${url}`;
    }
    // If already a full URL, return as-is
    return url;
}

// Upload cover image to Image Server
export const uploadCoverImage = async (file, comicSlug, onProgress, options = {}) => {
    const formData = new FormData();
    formData.append('cover', file);
    formData.append('comic_slug', comicSlug);

    const authHeaders = options.headers || getAdminAuthHeader();

    const response = await axios.post(`${IMAGE_SERVER_BASE}/upload/cover`, formData, {
        headers: {
            ...authHeaders,
            'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percent);
            }
        }
    });
    return response.data;
};

// Upload chapter images to Image Server
export const uploadChapterImages = async (files, comicSlug, chapterNumber, onProgress, options = {}) => {
    const formData = new FormData();

    // Sort files by name to maintain order
    const sortedFiles = [...files].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
    );

    sortedFiles.forEach(file => {
        formData.append('images', file);
    });
    formData.append('comic_slug', comicSlug);
    formData.append('chapter_number', chapterNumber.toString());

    const authHeaders = options.headers || getAdminAuthHeader();

    const response = await axios.post(`${IMAGE_SERVER_BASE}/upload/chapter`, formData, {
        headers: {
            ...authHeaders,
            'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percent);
            }
        }
    });
    return response.data;
};

// Get storage stats from Image Server
export const getImageServerStats = async (options = {}) => {
    const headers = options.headers || getAdminAuthHeader();
    const response = await axios.get(`${IMAGE_SERVER_BASE}/stats`, {
        headers
    });
    return response.data;
};

// Delete chapter images from Image Server
export const deleteChapterImages = async (comicSlug, chapterNumber, options = {}) => {
    const headers = options.headers || getAdminAuthHeader();
    const response = await axios.delete(
        `${IMAGE_SERVER_BASE}/chapters/${comicSlug}/${chapterNumber}`,
        { headers }
    );
    return response.data;
};

// ============== IMAGE BROWSER API ==============

// Browse folder
export const browseImages = async (folderPath = '', options = {}) => {
    const url = folderPath
        ? `${IMAGE_SERVER_BASE}/browse/${folderPath.replace(/^\/+/, '')}`
        : `${IMAGE_SERVER_BASE}/browse`;
    const headers = options.headers || getAdminAuthHeader();
    const response = await axios.get(url, { headers });
    return response.data;
};

// Create folder
export const createFolder = async (folderPath, options = {}) => {
    const headers = options.headers || getAdminAuthHeader();
    const response = await axios.post(
        `${IMAGE_SERVER_BASE}/folder`,
        { path: folderPath },
        { headers }
    );
    return response.data;
};

// Delete folder
export const deleteFolder = async (folderPath, options = {}) => {
    const headers = options.headers || getAdminAuthHeader();
    const response = await axios.delete(
        `${IMAGE_SERVER_BASE}/folder/${folderPath.replace(/^\/+/, '')}`,
        { headers }
    );
    return response.data;
};

// Delete image
export const deleteImage = async (imagePath, options = {}) => {
    const headers = options.headers || getAdminAuthHeader();
    const response = await axios.delete(
        `${IMAGE_SERVER_BASE}/images/${imagePath.replace(/^\/+/, '')}`,
        { headers }
    );
    return response.data;
};

// Rename file or folder
export const renameItem = async (oldPath, newName, options = {}) => {
    const headers = options.headers || getAdminAuthHeader();
    const response = await axios.put(
        `${IMAGE_SERVER_BASE}/rename`,
        { oldPath, newName },
        { headers }
    );
    return response.data;
};

// Upload images to specific folder
export const uploadToFolder = async (files, folderPath, onProgress, options = {}) => {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    formData.append('folder_path', folderPath);

    const authHeaders = options.headers || getAdminAuthHeader();

    const response = await axios.post(`${IMAGE_SERVER_BASE}/upload/to-folder`, formData, {
        headers: {
            ...authHeaders,
            'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percent);
            }
        }
    });
    return response.data;
};

// Replace image
export const replaceImage = async (imagePath, file, onProgress, options = {}) => {
    const formData = new FormData();
    formData.append('image', file);

    const authHeaders = options.headers || getAdminAuthHeader();

    const response = await axios.put(
        `${IMAGE_SERVER_BASE}/replace/${imagePath.replace(/^\/+/, '')}`,
        formData,
        {
            headers: {
                ...authHeaders,
                'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percent);
                }
            }
        }
    );
    return response.data;
};

