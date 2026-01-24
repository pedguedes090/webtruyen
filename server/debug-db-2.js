import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'comics.db'));

try {
    const columns = db.prepare("PRAGMA table_info(comics)").all();
    console.log("Columns:", JSON.stringify(columns.map(c => c.name)));

    const comics = db.prepare("SELECT id, title, created_by FROM comics ORDER BY id DESC LIMIT 5").all();
    console.log("Recent Comics:", JSON.stringify(comics, null, 2));

    const count = db.prepare("SELECT COUNT(*) as c FROM comics").get();
    console.log("Total Count:", count.c);
} catch (e) {
    console.error(e);
}
