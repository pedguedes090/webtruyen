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

// Helper to get admin auth header (JWT)
function getAuthHeader() {
    const token = localStorage.getItem('adminToken');
    if (token) {
        return { Authorization: `Bearer ${token}` };
    }
    return {};
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

export const createComic = async (comic) => {
    const response = await axios.post(`${API_BASE}/admin/comics`, comic, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const updateComic = async (id, comic) => {
    const response = await axios.put(`${API_BASE}/admin/comics/${id}`, comic, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const deleteComic = async (id) => {
    await axios.delete(`${API_BASE}/admin/comics/${id}`, {
        headers: getAuthHeader()
    });
};

export const createChapter = async (chapter) => {
    const response = await axios.post(`${API_BASE}/admin/chapters`, chapter, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const updateChapter = async (id, chapter) => {
    const response = await axios.put(`${API_BASE}/admin/chapters/${id}`, chapter, {
        headers: getAuthHeader()
    });
    return response.data;
};

export const deleteChapter = async (id) => {
    await axios.delete(`${API_BASE}/admin/chapters/${id}`, {
        headers: getAuthHeader()
    });
};

// Fetch images from HuggingFace folder URL
export const fetchHuggingFaceImages = async (folderUrl) => {
    const response = await axios.post(`${API_BASE}/huggingface/fetch-images`, {
        folder_url: folderUrl
    });
    return response.data;
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
export const uploadCoverImage = async (file, comicSlug, onProgress) => {
    const formData = new FormData();
    formData.append('cover', file);
    formData.append('comic_slug', comicSlug);

    const response = await axios.post(`${IMAGE_SERVER_BASE}/upload/cover`, formData, {
        headers: {
            ...getAuthHeader(),
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
export const uploadChapterImages = async (files, comicSlug, chapterNumber, onProgress) => {
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

    const response = await axios.post(`${IMAGE_SERVER_BASE}/upload/chapter`, formData, {
        headers: {
            ...getAuthHeader(),
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
export const getImageServerStats = async () => {
    const response = await axios.get(`${IMAGE_SERVER_BASE}/stats`, {
        headers: getAuthHeader()
    });
    return response.data;
};

// Delete chapter images from Image Server
export const deleteChapterImages = async (comicSlug, chapterNumber) => {
    const response = await axios.delete(
        `${IMAGE_SERVER_BASE}/chapters/${comicSlug}/${chapterNumber}`,
        { headers: getAuthHeader() }
    );
    return response.data;
};

// ============== IMAGE BROWSER API ==============

// Browse folder
export const browseImages = async (folderPath = '') => {
    const url = folderPath
        ? `${IMAGE_SERVER_BASE}/browse/${folderPath.replace(/^\/+/, '')}`
        : `${IMAGE_SERVER_BASE}/browse`;
    const response = await axios.get(url, { headers: getAuthHeader() });
    return response.data;
};

// Create folder
export const createFolder = async (folderPath) => {
    const response = await axios.post(
        `${IMAGE_SERVER_BASE}/folder`,
        { path: folderPath },
        { headers: getAuthHeader() }
    );
    return response.data;
};

// Delete folder
export const deleteFolder = async (folderPath) => {
    const response = await axios.delete(
        `${IMAGE_SERVER_BASE}/folder/${folderPath.replace(/^\/+/, '')}`,
        { headers: getAuthHeader() }
    );
    return response.data;
};

// Delete image
export const deleteImage = async (imagePath) => {
    const response = await axios.delete(
        `${IMAGE_SERVER_BASE}/images/${imagePath.replace(/^\/+/, '')}`,
        { headers: getAuthHeader() }
    );
    return response.data;
};

// Rename file or folder
export const renameItem = async (oldPath, newName) => {
    const response = await axios.put(
        `${IMAGE_SERVER_BASE}/rename`,
        { oldPath, newName },
        { headers: getAuthHeader() }
    );
    return response.data;
};

// Upload images to specific folder
export const uploadToFolder = async (files, folderPath, onProgress) => {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    formData.append('folder_path', folderPath);

    const response = await axios.post(`${IMAGE_SERVER_BASE}/upload/to-folder`, formData, {
        headers: {
            ...getAuthHeader(),
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
export const replaceImage = async (imagePath, file, onProgress) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await axios.put(
        `${IMAGE_SERVER_BASE}/replace/${imagePath.replace(/^\/+/, '')}`,
        formData,
        {
            headers: {
                ...getAuthHeader(),
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

