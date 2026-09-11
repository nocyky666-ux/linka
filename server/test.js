const assert = require('assert');
const http = require('http');
const server = require('./index');

const TEST_PORT = 4999;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path,
      method,
      headers
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Running LINKA Backend Integration Tests...');
  await new Promise(resolve => server.listen(TEST_PORT, resolve));

  try {
    // 1. Register test user
    const testUname = 'testuser_' + Date.now().toString(36);
    const regRes = await request('POST', '/api/auth/register', {
      username: testUname,
      name: 'Test Runner',
      password: 'password123',
      phone: '+62812345678',
      bio: 'Testing LINKA production backend'
    });
    assert.strictEqual(regRes.status, 201, 'Registration should return 201');
    assert.ok(regRes.body.token, 'Token must be provided');
    assert.ok(regRes.body.user.id, 'User ID must be generated');
    console.log('  ✅ Auth: Register passed (ID:', regRes.body.user.id, ')');

    const token = regRes.body.token;

    // 2. Login test
    const loginRes = await request('POST', '/api/auth/login', {
      username: testUname,
      password: 'password123'
    });
    assert.strictEqual(loginRes.status, 200, 'Login should return 200');
    assert.ok(loginRes.body.token, 'Login should return valid token');
    console.log('  ✅ Auth: Login passed');

    // 3. Auth Me
    const meRes = await request('GET', '/api/auth/me', null, token);
    assert.strictEqual(meRes.status, 200, 'Me endpoint should return 200');
    assert.strictEqual(meRes.body.user.username, testUname, 'Username matches token');
    console.log('  ✅ Auth: /api/auth/me passed');

    // 4. Send & List Messages
    const sendRes = await request('POST', '/api/messages', {
      chatId: '1',
      text: 'Halo dari test suite!',
      type: 'text'
    }, token);
    assert.strictEqual(sendRes.status, 201, 'Sending message returns 201');
    assert.ok(sendRes.body.message.id, 'Message has ID');

    const listRes = await request('GET', '/api/messages?chatId=1', null, token);
    assert.strictEqual(listRes.status, 200, 'List messages returns 200');
    assert.ok(Array.isArray(listRes.body.messages), 'Messages is array');
    console.log('  ✅ Messages: Send & List passed');

    // 5. Create & List Posts
    const postRes = await request('POST', '/api/posts', {
      text: 'Postingan pengujian backend terintegrasi.'
    }, token);
    assert.strictEqual(postRes.status, 201, 'Create post returns 201');
    assert.ok(postRes.body.post.id, 'Post has ID');

    const listPostsRes = await request('GET', '/api/posts');
    assert.strictEqual(listPostsRes.status, 200, 'List posts returns 200');
    assert.ok(listPostsRes.body.posts.length > 0, 'Posts list not empty');
    console.log('  ✅ Posts: Create & List passed');

    // 6. Search Users
    const searchRes = await request('GET', `/api/users/search?q=${testUname}`);
    assert.strictEqual(searchRes.status, 200, 'Search users returns 200');
    assert.ok(searchRes.body.users.length > 0, 'Found registered user');
    console.log('  ✅ Users: Search passed');

    console.log('\n🎉 ALL 6 BACKEND INTEGRATION TESTS PASSED WITHOUT ERRORS!');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
