import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Get user favorites
export const getFavorites = async (limit = 50, offset = 0) => {
    const token = localStorage.getItem('token');
    if (!token) return [];

    try {
        const response = await axios.get(`${API_BASE}/api/user/favorites`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { limit, offset }
        });
        return response.data;
    } catch (error) {
        console.error('Get favorites error:', error);
        return [];
    }
};

// Add to favorites
export const addFavorite = async (comicId) => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
        const response = await axios.post(`${API_BASE}/api/user/favorites/${comicId}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error('Add favorite error:', error);
        throw error;
    }
};

// Remove from favorites
export const removeFavorite = async (comicId) => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
        const response = await axios.delete(`${API_BASE}/api/user/favorites/${comicId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error('Remove favorite error:', error);
        throw error;
    }
};

// Check if favorite
export const checkFavorite = async (comicId) => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
        const response = await axios.get(`${API_BASE}/api/user/favorites/${comicId}/check`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data.is_favorite;
    } catch (error) {
        console.error('Check favorite error:', error);
        return false;
    }
};

// Get reading history
export const getHistory = async (limit = 50, offset = 0) => {
    const token = localStorage.getItem('token');
    if (!token) return [];

    try {
        const response = await axios.get(`${API_BASE}/api/user/history`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { limit, offset }
        });
        return response.data;
    } catch (error) {
        console.error('Get history error:', error);
        return [];
    }
};

// Update reading history
export const updateHistory = async (comicId, chapterId) => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
        await axios.post(`${API_BASE}/api/user/history`,
            { comic_id: comicId, chapter_id: chapterId },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return true;
    } catch (error) {
        // Silent error for history updates
        console.error('Update history error:', error);
        return false;
    }
};
