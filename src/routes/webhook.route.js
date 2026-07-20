const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const router = express.Router();

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

function verifySignature(rawBody, signature) {
  if (!signature || !rawBody) return false;

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(rawBody).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

router.post(
  '/webhook/deploy',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['x-hub-signature-256'];

    if (!verifySignature(req.body, signature)) {
      return res.status(401).send('Invalid signature');
    }

    let payload;
    try {
      payload = JSON.parse(req.body.toString('utf8'));
    } catch (e) {
      return res.status(400).send('Invalid JSON');
    }

    if (payload.ref !== 'refs/heads/main') {
      return res.status(200).send('Ignored - not main branch');
    }

    res.status(200).send('Deploy triggered');

    const deployCmd = `
      cd /cloudclusters/demo &&
      git pull origin main &&
      npm install --omit=dev &&
      supervisorctl reread &&
      supervisorctl update &&
      supervisorctl restart demo
    `;

    exec(deployCmd, (error, stdout, stderr) => {
      if (error) {
        console.error('Deploy failed:', error.message);
        return;
      }
      console.log('Deploy output:', stdout);
      if (stderr) console.error('Deploy stderr:', stderr);
    });
  }
);

module.exports = router;