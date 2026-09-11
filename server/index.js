const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const {
  db,
  getNextUserId,
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken
} = require('./db');

const PORT = parseInt(process.env.PORT || '3000', 10);
const UPLOAD_DIR = path.resolve(__dirname, '../uploads');
const STATIC_DIR = path.resolve(__dirname, '..');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Rate Limiting Map
const rateLimitMap = new Map();
function isRateLimited(ip, maxRequests = 120, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, startTime: now };
  if (now - record.startTime > windowMs) {
    record.count = 1;
    record.startTime = now;
    rateLimitMap.set(ip, record);
    return false;
  }
  record.count++;
  rateLimitMap.set(ip, record);
  return record.count > maxRequests;
}

// MIME Types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

// Response Helpers
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) { // 50MB max limit
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

function getAuthUser(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return verifyToken(token);
}

// Request Handler
const server = http.createServer(async (req, res) => {
  const clientIp = req.socket.remoteAddress || '127.0.0.1';

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    return res.end();
  }

  // Rate Limiting
  if (isRateLimited(clientIp)) {
    return sendJson(res, 429, { error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' });
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  /* ══════════════════════════════════════
     API ROUTES
  ══════════════════════════════════════ */
  if (pathname.startsWith('/api/')) {
    try {
      // ── Auth: Register ──
      if (pathname === '/api/auth/register' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { username, name, password, phone, bio } = body;

        if (!username || !name || !password) {
          return sendJson(res, 400, { error: 'Username, nama, dan password wajib diisi.' });
        }

        const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
        if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
          return sendJson(res, 400, { error: 'Username harus 3-30 karakter alphanumeric atau underscore.' });
        }

        // Check uniqueness
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
        if (existing) {
          return sendJson(res, 409, { error: `Username @${cleanUsername} sudah digunakan.` });
        }

        const userId = getNextUserId();
        const pwdHash = hashPassword(password);
        const createdAt = Date.now();
        const colors = [
          'linear-gradient(135deg,#7c3aed,#4f46e5)',
          'linear-gradient(135deg,#0891b2,#0e7490)',
          'linear-gradient(135deg,#059669,#047857)',
          'linear-gradient(135deg,#ec4899,#db2777)',
          'linear-gradient(135deg,#f59e0b,#d97706)'
        ];
        const userColor = colors[Math.floor(Math.random() * colors.length)];
        const publicKey = 'lk_secp256_' + require('crypto').randomBytes(8).toString('hex');

        db.prepare(`
          INSERT INTO users (id, username, name, password_hash, phone, bio, avatar, color, public_key, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(userId, cleanUsername, name.trim(), pwdHash, phone || '', bio || '', '', userColor, publicKey, createdAt);

        const token = createToken({ id: userId, username: cleanUsername, name: name.trim() });
        return sendJson(res, 201, {
          token,
          user: {
            id: userId,
            username: cleanUsername,
            name: name.trim(),
            phone: phone || '',
            bio: bio || '',
            avatar: '',
            color: userColor,
            publicKey,
            createdAt
          }
        });
      }

      // ── Auth: Login ──
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { username, password } = body;

        if (!username || !password) {
          return sendJson(res, 400, { error: 'Username dan password wajib diisi.' });
        }

        const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUsername);

        if (!user || !verifyPassword(password, user.password_hash)) {
          return sendJson(res, 401, { error: 'Username atau password salah.' });
        }

        const token = createToken({ id: user.id, username: user.username, name: user.name });
        return sendJson(res, 200, {
          token,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            phone: user.phone,
            bio: user.bio,
            avatar: user.avatar,
            color: user.color,
            publicKey: user.public_key,
            createdAt: user.created_at
          }
        });
      }

      // ── Auth: Me ──
      if (pathname === '/api/auth/me' && req.method === 'GET') {
        const auth = getAuthUser(req);
        if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });

        const user = db.prepare('SELECT id, username, name, phone, bio, avatar, color, public_key, created_at FROM users WHERE id = ?').get(auth.id);
        if (!user) return sendJson(res, 404, { error: 'User tidak ditemukan.' });

        return sendJson(res, 200, { user });
      }

      // ── Profile: Update ──
      if (pathname === '/api/profile' && req.method === 'PUT') {
        const auth = getAuthUser(req);
        if (!auth) return sendJson(res, 401, { error: 'Unauthorized' });

        const body = await parseJsonBody(req);
        const { name, bio, phone, avatar } = body;

        db.prepare(`
          UPDATE users
          SET name = COALESCE(?, name),
              bio = COALESCE(?, bio),
              phone = COALESCE(?, phone),
              avatar = COALESCE(?, avatar)
          WHERE id = ?
        `).run(name ? name.trim() : null, bio !== undefined ? bio.trim() : null, phone !== undefined ? phone.trim() : null, avatar !== undefined ? avatar : null, auth.id);

        const updated = db.prepare('SELECT id, username, name, phone, bio, avatar, color, public_key, created_at FROM users WHERE id = ?').get(auth.id);
        return sendJson(res, 200, { user: updated });
      }

      // ── Users: Search ──
      if (pathname === '/api/users/search' && req.method === 'GET') {
        const q = String(parsedUrl.query.q || '').trim().toLowerCase();
        let users;
        if (q) {
          users = db.prepare(`
            SELECT id, username, name, avatar, color, bio, phone
            FROM users
            WHERE username LIKE ? OR name LIKE ?
            LIMIT 20
          `).all(`%${q}%`, `%${q}%`);
        } else {
          users = db.prepare(`
            SELECT id, username, name, avatar, color, bio, phone
            FROM users
            ORDER BY created_at DESC
            LIMIT 20
          `).all();
        }
        return sendJson(res, 200, { users });
      }

      // ── Messages: Sync / List ──
      if (pathname === '/api/messages' && req.method === 'GET') {
        const auth = getAuthUser(req);
        const chatId = parsedUrl.query.chatId;
        let messages;
        if (chatId) {
          messages = db.prepare(`
            SELECT * FROM messages
            WHERE chat_id = ?
            ORDER BY timestamp ASC
            LIMIT 200
          `).all(chatId);
        } else if (auth) {
          messages = db.prepare(`
            SELECT * FROM messages
            WHERE target_id = ? OR sender_id = ? OR chat_id IN ('1', '2', 'linka_mesh_global')
            ORDER BY timestamp ASC
            LIMIT 500
          `).all(auth.id, auth.id);
        } else {
          messages = db.prepare(`
            SELECT * FROM messages
            WHERE chat_id IN ('1', '2', 'linka_mesh_global')
            ORDER BY timestamp ASC
            LIMIT 100
          `).all();
        }
        return sendJson(res, 200, { messages });
      }

      // ── Messages: Send ──
      if (pathname === '/api/messages' && req.method === 'POST') {
        const auth = getAuthUser(req);
        const body = await parseJsonBody(req);
        const { id, chatId, targetId, text, type, mediaUrl, fileName, fileSize, duration, encrypted } = body;

        const senderId = auth ? auth.id : (body.senderId || 'anon_mesh');
        const senderUsername = auth ? auth.username : (body.senderUsername || 'anon');
        const senderName = auth ? auth.name : (body.senderName || 'Anonymous Node');
        const msgId = id || ('m_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
        const timestamp = Date.now();

        db.prepare(`
          INSERT INTO messages (id, chat_id, sender_id, sender_username, sender_name, target_id, text, type, media_url, file_name, file_size, duration, timestamp, encrypted)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          msgId,
          chatId || '1',
          senderId,
          senderUsername,
          senderName,
          targetId || 'public',
          text || '',
          type || 'text',
          mediaUrl || '',
          fileName || '',
          fileSize || '',
          duration || '',
          timestamp,
          encrypted ? 1 : 0
        );

        return sendJson(res, 201, {
          success: true,
          message: {
            id: msgId,
            chatId: chatId || '1',
            senderId,
            senderUsername,
            senderName,
            targetId: targetId || 'public',
            text: text || '',
            type: type || 'text',
            mediaUrl: mediaUrl || '',
            fileName: fileName || '',
            fileSize: fileSize || '',
            duration: duration || '',
            timestamp
          }
        });
      }

      // ── Posts: List ──
      if (pathname === '/api/posts' && req.method === 'GET') {
        const posts = db.prepare(`
          SELECT * FROM posts
          WHERE archived = 0
          ORDER BY timestamp DESC
          LIMIT 50
        `).all();
        return sendJson(res, 200, { posts });
      }

      // ── Posts: Create ──
      if (pathname === '/api/posts' && req.method === 'POST') {
        const auth = getAuthUser(req);
        const body = await parseJsonBody(req);
        const { text, image } = body;

        if (!text && !image) {
          return sendJson(res, 400, { error: 'Postingan membutuhkan teks atau gambar.' });
        }

        const userId = auth ? auth.id : '0000001';
        const username = auth ? auth.username : 'novauser';
        const name = auth ? auth.name : 'Nova User';
        const postId = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        const timestamp = Date.now();

        db.prepare(`
          INSERT INTO posts (id, user_id, username, name, avatar, text, image, likes, archived, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
        `).run(postId, userId, username, name, '', text || '', image || '', timestamp);

        return sendJson(res, 201, {
          post: {
            id: postId,
            userId,
            username,
            name,
            text: text || '',
            image: image || '',
            likes: 0,
            archived: 0,
            timestamp
          }
        });
      }

      // ── Upload: General Base64 / Binary ──
      if (pathname === '/api/upload' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const { dataUrl, filename } = body;

        if (!dataUrl || !dataUrl.includes(',')) {
          return sendJson(res, 400, { error: 'Invalid dataUrl format' });
        }

        const [meta, base64Data] = dataUrl.split(',');
        const extMatch = meta.match(/data:(.*?);base64/);
        let ext = '.png';
        if (extMatch) {
          const mime = extMatch[1];
          if (mime.includes('jpeg') || mime.includes('jpg')) ext = '.jpg';
          else if (mime.includes('gif')) ext = '.gif';
          else if (mime.includes('webp')) ext = '.webp';
          else if (mime.includes('webm') || mime.includes('audio')) ext = '.webm';
          else if (mime.includes('pdf')) ext = '.pdf';
        }

        const fileId = 'up_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + ext;
        const filePath = path.join(UPLOAD_DIR, fileId);
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

        return sendJson(res, 201, {
          url: `/uploads/${fileId}`,
          filename: filename || fileId
        });
      }

      // 404 for Unknown API Routes
      return sendJson(res, 404, { error: 'API endpoint not found' });
    } catch (err) {
      console.error('[API ERROR]', err);
      return sendJson(res, 500, { error: err.message || 'Internal server error' });
    }
  }

  /* ══════════════════════════════════════
     STATIC FILE SERVING (PWA / Assets / Uploads)
  ══════════════════════════════════════ */
  let safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '') safePath = '/index.html';

  let fullPath = path.join(STATIC_DIR, safePath);
  if (pathname.startsWith('/uploads/')) {
    fullPath = path.join(UPLOAD_DIR, path.basename(pathname));
  }

  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback for SPA routing to index.html
      const indexPath = path.join(STATIC_DIR, 'index.html');
      fs.readFile(indexPath, (idxErr, content) => {
        if (idxErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('404 Not Found');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(fullPath).pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🚀 LINKA Backend Server running on http://localhost:${PORT}`);
  });
}

module.exports = server;
