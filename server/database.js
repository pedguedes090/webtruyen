import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'comics.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Migration: Convert legacy image_urls to multiple server format
try {
  const chapters = db.prepare('SELECT id, image_urls FROM chapters').all();
  const updateStmt = db.prepare('UPDATE chapters SET image_urls = ? WHERE id = ?');
  let migratedCount = 0;

  db.transaction(() => {
    for (const chapter of chapters) {
      try {
        let urls = JSON.parse(chapter.image_urls || '[]');
        // Check if it's the old format (array of strings)
        if (Array.isArray(urls) && (urls.length === 0 || typeof urls[0] === 'string')) {
          // Convert to new format: [{ server_name: 'Server 1', image_urls: [...] }]
          const newFormat = [
            {
              server_name: 'Server 1',
              image_urls: urls
            }
          ];
          updateStmt.run(JSON.stringify(newFormat), chapter.id);
          migratedCount++;
        }
      } catch (e) {
        console.error(`Failed to migrate chapter ${chapter.id}:`, e);
      }
    }
  })();

  if (migratedCount > 0) {
    console.log(`✅ Migrated ${migratedCount} chapters to multi-server format`);
  }
} catch (e) {
  console.error('Migration error:', e);
}

// Helper: Generate slug from title
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

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS comics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE,
    description TEXT,
    cover_url TEXT,
    author TEXT,
    status TEXT DEFAULT 'ongoing',
    genres TEXT DEFAULT '[]',
    views INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comic_id INTEGER NOT NULL,
    chapter_number REAL NOT NULL,
    title TEXT,
    image_urls TEXT NOT NULL DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comic_id) REFERENCES comics(id) ON DELETE CASCADE
  );

  -- Primary indexes
  CREATE INDEX IF NOT EXISTS idx_chapters_comic_id ON chapters(comic_id);
  CREATE INDEX IF NOT EXISTS idx_comics_views ON comics(views DESC);
  CREATE INDEX IF NOT EXISTS idx_comics_updated ON comics(updated_at DESC);
  
  -- Composite indexes for optimized queries
  CREATE INDEX IF NOT EXISTS idx_chapters_comic_number ON chapters(comic_id, chapter_number DESC);
  CREATE INDEX IF NOT EXISTS idx_chapters_comic_created ON chapters(comic_id, created_at DESC);
  
  -- Index for chapter created_at (used in subqueries for recent comics)
  CREATE INDEX IF NOT EXISTS idx_chapters_created ON chapters(created_at DESC);

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`);

// Migration: Add slug column if not exists and generate slugs for existing comics
try {
  db.exec(`ALTER TABLE comics ADD COLUMN slug TEXT`);
  console.log('✅ Added slug column to comics table');
} catch (e) {
  // Column already exists, ignore
}

// Create index for slug column (after migration ensures column exists)
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_comics_slug ON comics(slug)`);
} catch (e) {
  // Index already exists or other error
}

// Generate slugs for comics that don't have one
const comicsWithoutSlug = db.prepare('SELECT id, title FROM comics WHERE slug IS NULL').all();
if (comicsWithoutSlug.length > 0) {
  const updateSlug = db.prepare('UPDATE comics SET slug = ? WHERE id = ?');
  for (const comic of comicsWithoutSlug) {
    const slug = slugify(comic.title);
    updateSlug.run(slug, comic.id);
  }
  console.log(`✅ Generated slugs for ${comicsWithoutSlug.length} comics`);
}

// Comic queries
export const getAllComics = (limit = 20, offset = 0, search = '') => {
  if (search) {
    return db.prepare(`
      SELECT * FROM comics 
      WHERE title LIKE ? OR author LIKE ?
      ORDER BY updated_at DESC 
      LIMIT ? OFFSET ?
    `).all(`%${search}%`, `%${search}%`, limit, offset);
  }
  return db.prepare(`
    SELECT * FROM comics ORDER BY updated_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset);
};

export const getComicById = (id) => {
  return db.prepare('SELECT * FROM comics WHERE id = ?').get(id);
};

export const getComicBySlug = (slug) => {
  return db.prepare('SELECT * FROM comics WHERE slug = ?').get(slug);
};

export const getTopComics = (limit = 10) => {
  return db.prepare(`
    SELECT * FROM comics ORDER BY views DESC LIMIT ?
  `).all(limit);
};

// Get random featured comics from top views
export const getFeaturedComics = (count = 10, fromTop = 30) => {
  // Get top 30 comics by views
  const topComics = db.prepare(`
    SELECT * FROM comics ORDER BY views DESC LIMIT ?
  `).all(fromTop);

  // Shuffle and take 'count' random comics
  const shuffled = topComics.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

export const getRecentComics = (limit = 12, offset = 0) => {
  // Optimized: Single query with JOIN, avoiding N+1 problem
  // Step 1: Get comics with their latest chapter date using a more efficient query
  const comics = db.prepare(`
    SELECT c.*, 
      ch_latest.created_at as last_chapter_at,
      ch_latest.chapter_number as latest_chapter
    FROM comics c
    LEFT JOIN (
      SELECT comic_id, MAX(chapter_number) as max_num
      FROM chapters
      GROUP BY comic_id
    ) ch_max ON ch_max.comic_id = c.id
    LEFT JOIN chapters ch_latest ON ch_latest.comic_id = c.id AND ch_latest.chapter_number = ch_max.max_num
    ORDER BY ch_latest.created_at DESC NULLS LAST
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  if (comics.length === 0) return [];

  // Step 2: Batch fetch recent chapters for all comics in ONE query
  const comicIds = comics.map(c => c.id);
  const placeholders = comicIds.map(() => '?').join(',');

  const allChapters = db.prepare(`
    SELECT id, comic_id, chapter_number, title, created_at,
      ROW_NUMBER() OVER (PARTITION BY comic_id ORDER BY chapter_number DESC) as rn
    FROM chapters
    WHERE comic_id IN (${placeholders})
  `).all(...comicIds);

  // Filter to only top 3 chapters per comic
  const chaptersByComic = {};
  for (const ch of allChapters) {
    if (ch.rn <= 3) {
      if (!chaptersByComic[ch.comic_id]) {
        chaptersByComic[ch.comic_id] = [];
      }
      chaptersByComic[ch.comic_id].push({
        id: ch.id,
        chapter_number: ch.chapter_number,
        title: ch.title,
        created_at: ch.created_at
      });
    }
  }

  return comics.map(comic => ({
    ...comic,
    recent_chapters: chaptersByComic[comic.id] || []
  }));
};

export const createComic = (comic) => {
  const slug = slugify(comic.title);
  const stmt = db.prepare(`
    INSERT INTO comics (title, slug, description, cover_url, author, status, genres)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    comic.title,
    slug,
    comic.description || '',
    comic.cover_url || '',
    comic.author || '',
    comic.status || 'ongoing',
    JSON.stringify(comic.genres || [])
  );
  return { id: result.lastInsertRowid, slug, ...comic };
};

export const updateComic = (id, comic) => {
  // If title is being updated, regenerate slug
  const newSlug = comic.title ? slugify(comic.title) : null;
  const stmt = db.prepare(`
    UPDATE comics SET 
      title = COALESCE(?, title),
      slug = COALESCE(?, slug),
      description = COALESCE(?, description),
      cover_url = COALESCE(?, cover_url),
      author = COALESCE(?, author),
      status = COALESCE(?, status),
      genres = COALESCE(?, genres),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(
    comic.title,
    newSlug,
    comic.description,
    comic.cover_url,
    comic.author,
    comic.status,
    comic.genres ? JSON.stringify(comic.genres) : null,
    id
  );
  return getComicById(id);
};

export const deleteComic = (id) => {
  return db.prepare('DELETE FROM comics WHERE id = ?').run(id);
};

export const incrementViews = (id) => {
  return db.prepare('UPDATE comics SET views = views + 1 WHERE id = ?').run(id);
};

// Chapter queries
export const getChaptersByComicId = (comicId) => {
  const chapters = db.prepare(`
    SELECT id, comic_id, chapter_number, title, image_urls, created_at 
    FROM chapters 
    WHERE comic_id = ? 
    ORDER BY chapter_number ASC
  `).all(comicId);

  return chapters.map(ch => {
    try {
      ch.image_urls = JSON.parse(ch.image_urls || '[]');
    } catch (e) {
      ch.image_urls = [];
    }
    return ch;
  });
};

export const getChapterById = (id) => {
  const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(id);
  if (chapter) {
    try {
      chapter.image_urls = JSON.parse(chapter.image_urls || '[]');
    } catch (e) {
      chapter.image_urls = [];
    }
  }
  return chapter;
};

export const getChapterByComicSlugAndNumber = (comicSlug, chapterNumber) => {
  const chapter = db.prepare(`
    SELECT ch.* FROM chapters ch
    JOIN comics c ON ch.comic_id = c.id
    WHERE c.slug = ? AND ch.chapter_number = ?
  `).get(comicSlug, chapterNumber);

  if (chapter) {
    try {
      chapter.image_urls = JSON.parse(chapter.image_urls || '[]');
    } catch (e) {
      chapter.image_urls = [];
    }
  }
  return chapter;
};

export const createChapter = (chapter) => {
  const stmt = db.prepare(`
    INSERT INTO chapters (comic_id, chapter_number, title, image_urls)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(
    chapter.comic_id,
    chapter.chapter_number,
    chapter.title || '',
    JSON.stringify(chapter.image_urls || [])
  );

  // Update comic's updated_at
  db.prepare('UPDATE comics SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(chapter.comic_id);

  return { id: result.lastInsertRowid, ...chapter };
};

export const updateChapter = (id, chapter) => {
  const stmt = db.prepare(`
    UPDATE chapters SET 
      chapter_number = COALESCE(?, chapter_number),
      title = COALESCE(?, title),
      image_urls = COALESCE(?, image_urls)
    WHERE id = ?
  `);
  stmt.run(
    chapter.chapter_number,
    chapter.title,
    chapter.image_urls ? JSON.stringify(chapter.image_urls) : null,
    id
  );
  return getChapterById(id);
};

export const deleteChapter = (id) => {
  return db.prepare('DELETE FROM chapters WHERE id = ?').run(id);
};

export const getAdjacentChapters = (comicId, chapterNumber) => {
  const prev = db.prepare(`
    SELECT id, chapter_number FROM chapters 
    WHERE comic_id = ? AND chapter_number < ? 
    ORDER BY chapter_number DESC LIMIT 1
  `).get(comicId, chapterNumber);

  const next = db.prepare(`
    SELECT id, chapter_number FROM chapters 
    WHERE comic_id = ? AND chapter_number > ? 
    ORDER BY chapter_number ASC LIMIT 1
  `).get(comicId, chapterNumber);

  return { prev, next };
};

// User queries
export const createUser = (user) => {
  const stmt = db.prepare(`
    INSERT INTO users (username, email, password_hash, avatar_url)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(
    user.username,
    user.email,
    user.password_hash,
    user.avatar_url || null
  );
  return { id: result.lastInsertRowid, username: user.username, email: user.email };
};

export const getUserByEmail = (email) => {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
};

export const getUserById = (id) => {
  return db.prepare('SELECT id, username, email, avatar_url, created_at FROM users WHERE id = ?').get(id);
};

export const getUserByUsername = (username) => {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
};

// Genre cache (genres don't change often, cache for 5 minutes)
let genreCache = null;
let genreCacheTime = 0;
const GENRE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get all unique genres from comics (with caching)
export const getAllGenres = () => {
  const now = Date.now();

  // Return cached result if still valid
  if (genreCache && (now - genreCacheTime) < GENRE_CACHE_TTL) {
    return genreCache;
  }

  const comics = db.prepare("SELECT genres FROM comics WHERE genres IS NOT NULL AND genres != '[]'").all();
  const genreSet = new Set();

  comics.forEach(comic => {
    try {
      const genres = JSON.parse(comic.genres || '[]');
      genres.forEach(g => genreSet.add(g));
    } catch (e) {
      // Skip invalid JSON
    }
  });

  genreCache = Array.from(genreSet).sort();
  genreCacheTime = now;

  return genreCache;
};

// Invalidate genre cache (call when comics are created/updated/deleted)
export const invalidateGenreCache = () => {
  genreCache = null;
  genreCacheTime = 0;
};

// Get comics by genre
export const getComicsByGenre = (genre, limit = 20, offset = 0) => {
  return db.prepare(`
    SELECT * FROM comics 
    WHERE genres LIKE ? 
    ORDER BY updated_at DESC 
    LIMIT ? OFFSET ?
  `).all(`%"${genre}"%`, limit, offset);
};

export default db;

