import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import sharp from 'sharp';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB
const MAX_WIDTH = parseInt(process.env.MAX_WIDTH) || 1200;
const CONVERT_TO_WEBP = process.env.CONVERT_TO_WEBP === 'true';
const WEBP_QUALITY = parseInt(process.env.WEBP_QUALITY) || 85;

// Ensure upload directories exist
const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

ensureDir(path.join(UPLOAD_DIR, 'covers'));
ensureDir(path.join(UPLOAD_DIR, 'chapters'));
ensureDir(path.join(UPLOAD_DIR, 'temp'));

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false
}));

// CORS Configuration - Allow all origins for simplicity
app.use(cors({
    origin: true, // Allow all origins
    credentials: true
}));

app.use(express.json());

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'));
        }
    }
});

// Admin JWT Auth Middleware
function adminAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.admin = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Helper: Generate slug from title
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

// Helper: Process and save image
async function processImage(buffer, outputPath, isWebP = CONVERT_TO_WEBP) {
    let processor = sharp(buffer);

    // Get metadata
    const metadata = await processor.metadata();

    // Resize if too wide
    if (metadata.width > MAX_WIDTH) {
        processor = processor.resize(MAX_WIDTH, null, { withoutEnlargement: true });
    }

    // Convert to WebP or optimize
    if (isWebP && metadata.format !== 'gif') {
        const webpPath = outputPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        await processor.webp({ quality: WEBP_QUALITY }).toFile(webpPath);
        return path.basename(webpPath);
    } else if (metadata.format === 'gif') {
        // Keep GIF as-is (animations)
        await processor.toFile(outputPath);
        return path.basename(outputPath);
    } else {
        await processor.jpeg({ quality: 90 }).toFile(outputPath);
        return path.basename(outputPath);
    }
}

// ============== ROUTES ==============

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uploadDir: UPLOAD_DIR
    });
});

// Upload cover image
app.post('/upload/cover', adminAuth, upload.single('cover'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { comic_slug } = req.body;
        if (!comic_slug) {
            return res.status(400).json({ error: 'comic_slug is required' });
        }

        const slug = slugify(comic_slug);
        const ext = CONVERT_TO_WEBP ? 'webp' : 'jpg';
        const filename = `${slug}.${ext}`;
        const outputPath = path.join(UPLOAD_DIR, 'covers', filename);

        await processImage(req.file.buffer, outputPath);

        const imageUrl = `/images/covers/${filename}`;
        res.json({
            success: true,
            url: imageUrl,
            fullUrl: `${req.protocol}://${req.get('host')}${imageUrl}`
        });
    } catch (error) {
        console.error('Cover upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload chapter images (multiple)
app.post('/upload/chapter', adminAuth, upload.array('images', 500), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const { comic_slug, chapter_number } = req.body;
        if (!comic_slug || !chapter_number) {
            return res.status(400).json({ error: 'comic_slug and chapter_number are required' });
        }

        const slug = slugify(comic_slug);
        const chapterDir = path.join(UPLOAD_DIR, 'chapters', slug, chapter_number.toString());
        ensureDir(chapterDir);

        const uploadedUrls = [];

        // Sort files by original name to maintain order
        const sortedFiles = [...req.files].sort((a, b) =>
            a.originalname.localeCompare(b.originalname, undefined, { numeric: true })
        );

        for (let i = 0; i < sortedFiles.length; i++) {
            const file = sortedFiles[i];
            const paddedIndex = String(i + 1).padStart(3, '0');
            const ext = CONVERT_TO_WEBP ? 'webp' : path.extname(file.originalname).slice(1) || 'jpg';
            const filename = `${paddedIndex}.${ext}`;
            const outputPath = path.join(chapterDir, filename);

            const savedFilename = await processImage(file.buffer, outputPath);
            uploadedUrls.push(`/images/chapters/${slug}/${chapter_number}/${savedFilename}`);
        }

        res.json({
            success: true,
            count: uploadedUrls.length,
            urls: uploadedUrls,
            fullUrls: uploadedUrls.map(url => `${req.protocol}://${req.get('host')}${url}`)
        });
    } catch (error) {
        console.error('Chapter upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve static images
app.use('/images', express.static(UPLOAD_DIR, {
    maxAge: '30d',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        // Set cache headers for images
        res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
    }
}));

// Delete image (admin only)
app.delete('/images/*', adminAuth, (req, res) => {
    try {
        const imagePath = req.params[0];
        const fullPath = path.join(UPLOAD_DIR, imagePath);

        // Security: Ensure path is within UPLOAD_DIR
        const resolvedPath = path.resolve(fullPath);
        const resolvedUploadDir = path.resolve(UPLOAD_DIR);

        if (!resolvedPath.startsWith(resolvedUploadDir)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: 'Image not found' });
        }

        fs.unlinkSync(fullPath);
        res.json({ success: true, message: 'Image deleted' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete entire chapter folder (admin only)
app.delete('/chapters/:comicSlug/:chapterNumber', adminAuth, (req, res) => {
    try {
        const { comicSlug, chapterNumber } = req.params;
        const chapterDir = path.join(UPLOAD_DIR, 'chapters', comicSlug, chapterNumber);

        if (!fs.existsSync(chapterDir)) {
            return res.status(404).json({ error: 'Chapter folder not found' });
        }

        fs.rmSync(chapterDir, { recursive: true, force: true });
        res.json({ success: true, message: 'Chapter images deleted' });
    } catch (error) {
        console.error('Delete chapter error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get storage stats
app.get('/stats', adminAuth, (req, res) => {
    try {
        const getDirectorySize = (dirPath) => {
            let size = 0;
            if (fs.existsSync(dirPath)) {
                const files = fs.readdirSync(dirPath, { withFileTypes: true });
                for (const file of files) {
                    const filePath = path.join(dirPath, file.name);
                    if (file.isDirectory()) {
                        size += getDirectorySize(filePath);
                    } else {
                        size += fs.statSync(filePath).size;
                    }
                }
            }
            return size;
        };

        const coversSize = getDirectorySize(path.join(UPLOAD_DIR, 'covers'));
        const chaptersSize = getDirectorySize(path.join(UPLOAD_DIR, 'chapters'));

        res.json({
            covers: {
                size: coversSize,
                sizeFormatted: `${(coversSize / 1024 / 1024).toFixed(2)} MB`
            },
            chapters: {
                size: chaptersSize,
                sizeFormatted: `${(chaptersSize / 1024 / 1024).toFixed(2)} MB`
            },
            total: {
                size: coversSize + chaptersSize,
                sizeFormatted: `${((coversSize + chaptersSize) / 1024 / 1024).toFixed(2)} MB`
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============== BROWSE/MANAGE ROUTES ==============

// Browse root folders (covers, chapters)
app.get('/browse', adminAuth, (req, res) => {
    try {
        const folders = ['covers', 'chapters'].map(name => {
            const folderPath = path.join(UPLOAD_DIR, name);
            const stats = fs.existsSync(folderPath) ? fs.statSync(folderPath) : null;
            return {
                name,
                type: 'folder',
                path: `/${name}`,
                modified: stats?.mtime
            };
        });
        res.json({ path: '/', folders, files: [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Browse a specific folder
app.get('/browse/*', adminAuth, (req, res) => {
    try {
        const relativePath = req.params[0] || '';
        const fullPath = path.join(UPLOAD_DIR, relativePath);

        // Security check
        const resolvedPath = path.resolve(fullPath);
        const resolvedUploadDir = path.resolve(UPLOAD_DIR);
        if (!resolvedPath.startsWith(resolvedUploadDir)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        const items = fs.readdirSync(fullPath, { withFileTypes: true });

        const folders = items
            .filter(item => item.isDirectory())
            .map(item => {
                const itemPath = path.join(fullPath, item.name);
                const stats = fs.statSync(itemPath);
                // Count children
                const children = fs.readdirSync(itemPath).length;
                return {
                    name: item.name,
                    type: 'folder',
                    path: `/${relativePath}/${item.name}`.replace(/\/+/g, '/'),
                    modified: stats.mtime,
                    childCount: children
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

        const files = items
            .filter(item => item.isFile() && /\.(jpg|jpeg|png|webp|gif)$/i.test(item.name))
            .map(item => {
                const itemPath = path.join(fullPath, item.name);
                const stats = fs.statSync(itemPath);
                return {
                    name: item.name,
                    type: 'file',
                    path: `/${relativePath}/${item.name}`.replace(/\/+/g, '/'),
                    url: `/images/${relativePath}/${item.name}`.replace(/\/+/g, '/'),
                    size: stats.size,
                    sizeFormatted: stats.size < 1024
                        ? `${stats.size} B`
                        : stats.size < 1024 * 1024
                            ? `${(stats.size / 1024).toFixed(1)} KB`
                            : `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
                    modified: stats.mtime
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

        // Get parent path
        const pathParts = relativePath.split('/').filter(Boolean);
        const parentPath = pathParts.length > 0
            ? '/' + pathParts.slice(0, -1).join('/')
            : null;

        res.json({
            path: '/' + relativePath,
            parentPath,
            folders,
            files,
            totalFolders: folders.length,
            totalFiles: files.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create folder
app.post('/folder', adminAuth, (req, res) => {
    try {
        const { path: folderPath } = req.body;
        if (!folderPath) {
            return res.status(400).json({ error: 'path is required' });
        }

        const fullPath = path.join(UPLOAD_DIR, folderPath);

        // Security check
        const resolvedPath = path.resolve(fullPath);
        const resolvedUploadDir = path.resolve(UPLOAD_DIR);
        if (!resolvedPath.startsWith(resolvedUploadDir)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (fs.existsSync(fullPath)) {
            return res.status(400).json({ error: 'Folder already exists' });
        }

        fs.mkdirSync(fullPath, { recursive: true });
        res.json({ success: true, path: folderPath });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete folder
app.delete('/folder/*', adminAuth, (req, res) => {
    try {
        const relativePath = req.params[0];
        const fullPath = path.join(UPLOAD_DIR, relativePath);

        // Security check
        const resolvedPath = path.resolve(fullPath);
        const resolvedUploadDir = path.resolve(UPLOAD_DIR);
        if (!resolvedPath.startsWith(resolvedUploadDir)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Prevent deleting root folders
        if (['covers', 'chapters', 'temp'].includes(relativePath)) {
            return res.status(403).json({ error: 'Cannot delete root folders' });
        }

        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        fs.rmSync(fullPath, { recursive: true, force: true });
        res.json({ success: true, message: 'Folder deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rename file or folder
app.put('/rename', adminAuth, (req, res) => {
    try {
        const { oldPath, newName } = req.body;
        if (!oldPath || !newName) {
            return res.status(400).json({ error: 'oldPath and newName are required' });
        }

        const fullOldPath = path.join(UPLOAD_DIR, oldPath);
        const parentDir = path.dirname(fullOldPath);
        const fullNewPath = path.join(parentDir, newName);

        // Security checks
        const resolvedOldPath = path.resolve(fullOldPath);
        const resolvedNewPath = path.resolve(fullNewPath);
        const resolvedUploadDir = path.resolve(UPLOAD_DIR);

        if (!resolvedOldPath.startsWith(resolvedUploadDir) || !resolvedNewPath.startsWith(resolvedUploadDir)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!fs.existsSync(fullOldPath)) {
            return res.status(404).json({ error: 'File or folder not found' });
        }

        if (fs.existsSync(fullNewPath)) {
            return res.status(400).json({ error: 'A file or folder with that name already exists' });
        }

        fs.renameSync(fullOldPath, fullNewPath);

        const newRelativePath = path.join(path.dirname(oldPath), newName).replace(/\\/g, '/');
        res.json({ success: true, newPath: newRelativePath });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload image to specific folder
app.post('/upload/to-folder', adminAuth, upload.array('images', 500), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const { folder_path } = req.body;
        if (!folder_path) {
            return res.status(400).json({ error: 'folder_path is required' });
        }

        const targetDir = path.join(UPLOAD_DIR, folder_path);

        // Security check
        const resolvedPath = path.resolve(targetDir);
        const resolvedUploadDir = path.resolve(UPLOAD_DIR);
        if (!resolvedPath.startsWith(resolvedUploadDir)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        ensureDir(targetDir);

        const uploadedFiles = [];
        for (const file of req.files) {
            const ext = CONVERT_TO_WEBP ? 'webp' : path.extname(file.originalname).slice(1) || 'jpg';
            const baseName = path.basename(file.originalname, path.extname(file.originalname));
            const filename = `${baseName}.${ext}`;
            const outputPath = path.join(targetDir, filename);

            const savedFilename = await processImage(file.buffer, outputPath);
            uploadedFiles.push({
                name: savedFilename,
                url: `/images${folder_path}/${savedFilename}`.replace(/\/+/g, '/')
            });
        }

        res.json({
            success: true,
            count: uploadedFiles.length,
            files: uploadedFiles
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Replace a specific image
app.put('/replace/*', adminAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const relativePath = req.params[0];
        const fullPath = path.join(UPLOAD_DIR, relativePath);

        // Security check
        const resolvedPath = path.resolve(fullPath);
        const resolvedUploadDir = path.resolve(UPLOAD_DIR);
        if (!resolvedPath.startsWith(resolvedUploadDir)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: 'Original file not found' });
        }

        // Delete old file
        fs.unlinkSync(fullPath);

        // Save new file with same name (might change extension if converting to webp)
        const dir = path.dirname(fullPath);
        const baseName = path.basename(relativePath, path.extname(relativePath));
        const ext = CONVERT_TO_WEBP ? 'webp' : path.extname(relativePath).slice(1);
        const newFilename = `${baseName}.${ext}`;
        const newPath = path.join(dir, newFilename);

        await processImage(req.file.buffer, newPath);

        const newRelativePath = path.join(path.dirname(relativePath), newFilename).replace(/\\/g, '/');
        res.json({
            success: true,
            newPath: newRelativePath,
            url: `/images/${newRelativePath}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
            });
        }
    }
    console.error('Server error:', error);
    res.status(500).json({ error: error.message });
});

// Start server
app.listen(PORT, () => {
    console.log(`🖼️  Image Server running on port ${PORT}`);
    console.log(`📁 Upload directory: ${path.resolve(UPLOAD_DIR)}`);
    console.log(`📐 Max width: ${MAX_WIDTH}px`);
    console.log(`🔄 WebP conversion: ${CONVERT_TO_WEBP ? 'Enabled' : 'Disabled'}`);
});
