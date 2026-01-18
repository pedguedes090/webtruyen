import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import * as db from './database.js';
import { invalidateGenreCache, getTotalComicsCount, getRecentComicsCount, getComicsByGenreCount, warmupCountCache, invalidateCountCache } from './database.js';
import rateLimit from 'express-rate-limit';
import { blockBots, validateApiParams, sanitizeHuggingFaceUrl } from './middleware/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'your-admin-secret-key-change-in-production';
const IMAGE_SERVER_URL = process.env.IMAGE_SERVER_URL || 'http://localhost:3002';
const TIKTOK_IMAGE_BASE_URL = process.env.TIKTOK_IMAGE_BASE_URL || 'https://p16-oec-sg.ibyteimg.com/obj/tos-alisg-avt-0068';

// Helper: Delete images from Image Server (fire and forget)
async function deleteImagesFromServer(path, token) {
    try {
        await fetch(`${IMAGE_SERVER_URL}${path}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (error) {
        console.error(`Failed to delete from Image Server: ${path}`, error.message);
    }
}

// Helper: Generate slug from title (for image paths)
function slugify(text) {
    return text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}


// Trust first proxy (e.g., nginx, cloudflare, etc.)
// This is required for express-rate-limit to work correctly behind a proxy
app.set('trust proxy', 1);

// Rate Limiting
// Tính toán: 500 req/15 phút = ~0.56 req/giây/user
// Server SQLite + cache có thể xử lý 100-200 req/giây tổng → rất an toàn
// Cho phép đọc marathon + shared IP mà không bị block
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // limit each IP to 500 requests per windowMs (increased from 300)
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false }, // Skip X-Forwarded-For validation
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // limit each IP to 20 login requests per hour
    message: { error: 'Too many login attempts, please try again later' },
    validate: { xForwardedForHeader: false }, // Skip X-Forwarded-For validation
});

// Security Headers with Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: [
                "'self'",
                "data:",
                "https://huggingface.co",
                "https://*.huggingface.co",
                "https://*.hf.co",           // HuggingFace CDN (xethub, cas-bridge, etc.)
                "https://via.placeholder.com",
                "https://serrverimg.duongkum999.me",  // Your image server
                "https://*.ibyteimg.com",    // TikTok/ByteDance images
                "https://drive.google.com",   // Google Drive
                "https://*.googleusercontent.com",  // Google images
                "https://*.ggpht.com",        // Google Photos thumbnails
            ],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://static.cloudflareinsights.com"  // Cloudflare analytics
            ],
            connectSrc: [
                "'self'",
                "https://huggingface.co",
                "https://*.hf.co",
                "https://serrverimg.duongkum999.me",
                "https://*.ibyteimg.com",
                "https://drive.google.com",
                "https://*.googleusercontent.com",
            ],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// CORS Configuration - Allow all origins for simplicity

app.use(cors({
    origin: true, // Allow all origins
    credentials: true
}));
app.use(express.json());

// View tracking helper - only increment once per comic per hour per IP
const viewedComics = new Map(); // Map<"ip-comicId", timestamp>
const VIEW_COOLDOWN = 60 * 60 * 1000; // 1 hour

function shouldIncrementView(ip, comicId) {
    const key = `${ip}-${comicId}`;
    const lastViewed = viewedComics.get(key);
    const now = Date.now();

    if (!lastViewed || (now - lastViewed) > VIEW_COOLDOWN) {
        viewedComics.set(key, now);
        // Clean up old entries periodically
        if (viewedComics.size > 10000) {
            const cutoff = now - VIEW_COOLDOWN;
            for (const [k, v] of viewedComics) {
                if (v < cutoff) viewedComics.delete(k);
            }
        }
        return true;
    }
    return false;
}
// Apply Global Security Middleware
app.use(blockBots);
app.use('/api/', validateApiParams);
app.use(sanitizeHuggingFaceUrl);

// Apply rate limits
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/admin/login', authLimiter);

// Admin JWT Auth Middleware
const adminAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Admin authentication required' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
        if (decoded.role !== 'admin') {
            throw new Error('Not admin');
        }
        req.admin = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired admin token' });
    }
};

// User JWT Auth Middleware
const userAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// ============== AUTH ROUTES ==============

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user exists
        const existingEmail = db.getUserByEmail(email);
        if (existingEmail) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const existingUsername = db.getUserByUsername(username);
        if (existingUsername) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Create user
        const user = db.createUser({ username, email, password_hash });

        // Generate token
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            success: true,
            user: { id: user.id, username: user.username, email: user.email },
            token
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = db.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            user: { id: user.id, username: user.username, email: user.email, avatar_url: user.avatar_url },
            token
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current user
app.get('/api/auth/me', userAuth, (req, res) => {
    try {
        const user = db.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============== CONFIG ROUTES ==============

// Get TikTok image base URL (for admin to build image URLs from IDs)
app.get('/api/config/tiktok-base-url', (req, res) => {
    res.json({ baseUrl: TIKTOK_IMAGE_BASE_URL });
});

// ============== GENRES ROUTES ==============

// Get all genres
app.get('/api/genres', (req, res) => {
    try {
        const genres = db.getAllGenres();
        res.json(genres);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get comics by genre
app.get('/api/genres/:genre/comics', (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const comics = db.getComicsByGenre(req.params.genre, parseInt(limit), parseInt(offset));
        const total = getComicsByGenreCount(req.params.genre);
        res.json({
            data: comics.map(c => ({
                ...c,
                genres: JSON.parse(c.genres || '[]')
            })),
            total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============== PUBLIC ROUTES ==============

// Get all comics with pagination and search
app.get('/api/comics', (req, res) => {
    try {
        const { limit = 20, offset = 0, search = '' } = req.query;
        const comics = db.getAllComics(parseInt(limit), parseInt(offset), search);
        const total = getTotalComicsCount(search);
        res.json({
            data: comics.map(c => ({
                ...c,
                genres: JSON.parse(c.genres || '[]')
            })),
            total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get top/trending comics
app.get('/api/comics/top', (req, res) => {
    try {
        const { limit = 10, offset = 0 } = req.query;
        const comics = db.getTopComics(parseInt(limit), parseInt(offset));
        const total = getTotalComicsCount();
        res.json({
            data: comics.map(c => ({
                ...c,
                genres: JSON.parse(c.genres || '[]')
            })),
            total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get featured comics (random from top views)
app.get('/api/comics/featured', (req, res) => {
    try {
        const { count = 10, fromTop = 30 } = req.query;
        const comics = db.getFeaturedComics(parseInt(count), parseInt(fromTop));
        res.json(comics.map(c => ({
            ...c,
            genres: JSON.parse(c.genres || '[]')
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get recently updated comics
app.get('/api/comics/recent', (req, res) => {
    try {
        const { limit = 12, offset = 0 } = req.query;
        const comics = db.getRecentComics(parseInt(limit), parseInt(offset));
        const total = getRecentComicsCount();
        res.json({
            data: comics.map(c => ({
                ...c,
                genres: JSON.parse(c.genres || '[]')
            })),
            total
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single comic by ID
app.get('/api/comics/:id', (req, res) => {
    try {
        const comic = db.getComicById(req.params.id);
        if (!comic) {
            return res.status(404).json({ error: 'Comic not found' });
        }

        // Increment views only once per hour per IP
        if (shouldIncrementView(req.ip, comic.id)) {
            db.incrementViews(comic.id);
        }

        res.json({
            ...comic,
            genres: JSON.parse(comic.genres || '[]')
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single comic by slug
app.get('/api/comics/slug/:slug', (req, res) => {
    try {
        const comic = db.getComicBySlug(req.params.slug);
        if (!comic) {
            return res.status(404).json({ error: 'Comic not found' });
        }

        // Increment views only once per hour per IP
        if (shouldIncrementView(req.ip, comic.id)) {
            db.incrementViews(comic.id);
        }

        res.json({
            ...comic,
            genres: JSON.parse(comic.genres || '[]')
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get chapter by comic slug and chapter number
app.get('/api/comics/slug/:slug/chapter/:number', (req, res) => {
    try {
        const { slug, number } = req.params;
        const chapterNumber = parseFloat(number);

        const chapter = db.getChapterByComicSlugAndNumber(slug, chapterNumber);
        if (!chapter) {
            return res.status(404).json({ error: 'Chapter not found' });
        }

        const adjacent = db.getAdjacentChapters(chapter.comic_id, chapter.chapter_number);
        const comic = db.getComicBySlug(slug);

        res.json({
            ...chapter,
            // image_urls already parsed in database.js
            prev_chapter: adjacent.prev,
            next_chapter: adjacent.next,
            comic_slug: slug,
            comic_title: comic?.title
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get chapters for a comic
app.get('/api/comics/:id/chapters', (req, res) => {
    try {
        const chapters = db.getChaptersByComicId(req.params.id);
        res.json(chapters);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single chapter by ID
app.get('/api/chapters/:id', (req, res) => {
    try {
        const chapter = db.getChapterById(req.params.id);
        if (!chapter) {
            return res.status(404).json({ error: 'Chapter not found' });
        }

        const adjacent = db.getAdjacentChapters(chapter.comic_id, chapter.chapter_number);

        res.json({
            ...chapter,
            image_urls: JSON.parse(chapter.image_urls || '[]'),
            prev_chapter: adjacent.prev,
            next_chapter: adjacent.next
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch images from HuggingFace folder URL
// Accepts URLs like: https://huggingface.co/datasets/datalocalapi/truyen/tree/main/trigger/1
app.post('/api/huggingface/fetch-images', async (req, res) => {
    try {
        const { folder_url } = req.body;

        if (!folder_url) {
            return res.status(400).json({ error: 'folder_url is required' });
        }

        // Parse HuggingFace URL
        // Format: https://huggingface.co/datasets/{owner}/{repo}/tree/{branch}/{path}
        const urlPattern = /huggingface\.co\/datasets\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)\/(.+)/;
        const match = folder_url.match(urlPattern);

        if (!match) {
            return res.status(400).json({
                error: 'Invalid HuggingFace URL format. Expected: https://huggingface.co/datasets/{owner}/{repo}/tree/{branch}/{path}'
            });
        }

        const [, owner, repo, branch, path] = match;

        // Security check: Prevent path traversal
        if (path.includes('..') || path.includes('~')) {
            return res.status(400).json({ error: 'Invalid path' });
        }

        const apiUrl = `https://huggingface.co/api/datasets/${owner}/${repo}/tree/${branch}/${path}`;

        // Fetch file list from HuggingFace API
        const response = await fetch(apiUrl);

        if (!response.ok) {
            return res.status(response.status).json({
                error: `HuggingFace API error: ${response.statusText}`
            });
        }

        const files = await response.json();

        // Filter image files and generate direct URLs
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const imageFiles = files
            .filter(file => file.type === 'file' && imageExtensions.some(ext => file.path.toLowerCase().endsWith(ext)))
            .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }))
            .map(file => `https://huggingface.co/datasets/${owner}/${repo}/resolve/${branch}/${file.path}`);

        res.json({
            folder_url,
            count: imageFiles.length,
            image_urls: imageFiles
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============== ADMIN ROUTES ==============

// Verify admin credentials and issue JWT
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        // Issue Admin JWT
        const token = jwt.sign(
            { username: ADMIN_USERNAME, role: 'admin' },
            ADMIN_JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Create comic
app.post('/api/admin/comics', adminAuth, (req, res) => {
    try {
        const comic = db.createComic(req.body);
        invalidateGenreCache(); // Clear genre cache
        invalidateCountCache(); // Clear count cache
        res.status(201).json(comic);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update comic
app.put('/api/admin/comics/:id', adminAuth, (req, res) => {
    try {
        const comic = db.updateComic(req.params.id, req.body);
        if (!comic) {
            return res.status(404).json({ error: 'Comic not found' });
        }
        invalidateGenreCache(); // Clear genre cache
        res.json({
            ...comic,
            genres: JSON.parse(comic.genres || '[]')
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete comic (and its images from Image Server)
app.delete('/api/admin/comics/:id', adminAuth, async (req, res) => {
    try {
        const comic = db.getComicById(req.params.id);
        if (!comic) {
            return res.status(404).json({ error: 'Comic not found' });
        }

        const token = req.headers.authorization?.split(' ')[1];
        const comicSlug = slugify(comic.title);

        // Delete all chapter images from Image Server
        const chapters = db.getChaptersByComicId(req.params.id);
        for (const chapter of chapters) {
            deleteImagesFromServer(`/chapters/${comicSlug}/${chapter.chapter_number}`, token);
        }

        // Delete cover image if it's from our Image Server
        if (comic.cover_url?.startsWith('/images/')) {
            deleteImagesFromServer(comic.cover_url.replace('/images', ''), token);
        }

        // Delete from database (will cascade delete chapters)
        db.deleteComic(req.params.id);
        invalidateCountCache(); // Clear count cache
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create chapter
app.post('/api/admin/chapters', adminAuth, (req, res) => {
    try {
        const chapter = db.createChapter(req.body);
        invalidateCountCache(); // Clear count cache (affects recent count)
        res.status(201).json(chapter);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update chapter
app.put('/api/admin/chapters/:id', adminAuth, (req, res) => {
    try {
        const chapter = db.updateChapter(req.params.id, req.body);
        if (!chapter) {
            return res.status(404).json({ error: 'Chapter not found' });
        }
        // image_urls is already parsed by getChapterById in updateChapter
        res.json(chapter);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete chapter (and its images from Image Server)
app.delete('/api/admin/chapters/:id', adminAuth, async (req, res) => {
    try {
        const chapter = db.getChapterById(req.params.id);
        if (!chapter) {
            return res.status(404).json({ error: 'Chapter not found' });
        }

        const comic = db.getComicById(chapter.comic_id);
        if (comic) {
            const token = req.headers.authorization?.split(' ')[1];
            const comicSlug = slugify(comic.title);
            // Delete chapter images from Image Server
            deleteImagesFromServer(`/chapters/${comicSlug}/${chapter.chapter_number}`, token);
        }

        db.deleteChapter(req.params.id);
        invalidateCountCache(); // Clear count cache
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============== SERVE REACT BUILD ==============
// Serve static files from React build
const clientPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Comic server running at http://localhost:${PORT}`);
    if (ADMIN_USERNAME === 'admin' && ADMIN_PASSWORD === 'admin123') {
        console.warn('⚠️  WARNING: Using default admin credentials. Please update .env file!');
    }
    // Warm up cache on server start
    warmupCountCache();
});
