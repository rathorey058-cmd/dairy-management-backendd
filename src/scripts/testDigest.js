const http = require('http');
const crypto = require('crypto');

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function testDigest(username, password, channel) {
  const uri = `/ISAPI/Streaming/channels/${channel}/picture`;
  const req1 = http.get(`http://192.168.31.129:80${uri}`, (res1) => {
    const authHeader = res1.headers['www-authenticate'] || '';
    const realmMatch = authHeader.match(/realm="([^"]+)"/);
    const nonceMatch = authHeader.match(/nonce="([^"]+)"/);
    const qopMatch = authHeader.match(/qop="([^"]+)"/);
    const opaqueMatch = authHeader.match(/opaque="([^"]+)"/);

    if (!realmMatch || !nonceMatch) {
      console.log('No digest header found:', authHeader);
      return;
    }

    const realm = realmMatch[1];
    const nonce = nonceMatch[1];
    const qop = qopMatch ? qopMatch[1] : 'auth';
    const opaque = opaqueMatch ? opaqueMatch[1] : '';
    const cnonce = '0a4f113b';
    const nc = '00000001';

    const ha1 = md5(`${username}:${realm}:${password}`);
    const ha2 = md5(`GET:${uri}`);
    const response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);

    let authStr = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
    if (qop) authStr += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
    if (opaque) authStr += `, opaque="${opaque}"`;

    const req2 = http.get({
      host: '192.168.31.129',
      port: 80,
      path: uri,
      headers: { 'Authorization': authStr }
    }, (authRes) => {
      console.log(`AUTH RESULT [user: ${username}, ch: ${channel}]: Status=${authRes.statusCode}, Type=${authRes.headers['content-type']}, Length=${authRes.headers['content-length']}`);
      let chunks = '';
      authRes.on('data', d => chunks += d.toString());
      authRes.on('end', () => console.log(`Body for ${username}: ${chunks}`));
    });
    req2.on('error', err => console.error('Req2 err:', err.message));
  });
  req1.on('error', err => console.error('Req1 err:', err.message));
}

testDigest('admin', 'Absc@2025', '101');
testDigest('9826090919', 'Absc@2025', '101');
testDigest('admin', 'Absc@2025', '102');
