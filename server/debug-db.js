import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'comics.db'));

console.log('--- Table Info: comics ---');
const columns = db.prepare("PRAGMA table_info(comics)").all();
console.log(columns.map(c => c.name).join(', '));

console.log('\n--- Recent Comics (Last 5) ---');
const comics = db.prepare("SELECT id, title, created_by, created_at FROM comics ORDER BY id DESC LIMIT 5").all();
console.table(comics);

console.log('\n--- Users ---');
const users = db.prepare("SELECT id, username, email, role FROM users").all();
console.table(users);
