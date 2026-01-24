import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB connection directly since specialized script
const db = new Database(path.join(__dirname, 'comics.db'));

const email = process.argv[2];
const role = process.argv[3];

if (!email || !role) {
    console.log('❌ Cách sử dụng: node set-role.js <email> <role>');
    console.log('👉 Ví dụ: node set-role.js team@example.com group');
    console.log('   Các role hợp lệ: user, group, admin');
    process.exit(1);
}

const validRoles = ['user', 'group', 'admin'];
if (!validRoles.includes(role)) {
    console.log(`❌ Role không hợp lệ. Chỉ chấp nhận: ${validRoles.join(', ')}`);
    process.exit(1);
}

try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
        console.error(`❌ Không tìm thấy user có email: ${email}`);
        process.exit(1);
    }

    db.prepare('UPDATE users SET role = ? WHERE email = ?').run(role, email);
    console.log(`✅ Thành công! Đã set quyền [${role}] cho user [${email}]`);

} catch (error) {
    console.error('Lỗi:', error.message);
}
