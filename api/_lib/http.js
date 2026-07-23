const readJsonBody = (req) => new Promise((resolve, reject) => {
  if (req.body && typeof req.body === 'object') {
    resolve(req.body);
    return;
  }
  let raw = '';
  req.on('data', (chunk) => { raw += chunk; });
  req.on('end', () => {
    if (!raw) {
      resolve({});
      return;
    }
    try {
      resolve(JSON.parse(raw));
    } catch (error) {
      reject(new Error('Invalid JSON body'));
    }
  });
  req.on('error', reject);
});

const sendJson = (res, statusCode, body) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

module.exports = { readJsonBody, sendJson };
