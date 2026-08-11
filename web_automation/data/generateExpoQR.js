const https = require('https');
const fs = require('fs');

const targetUrl = 'exp://192.168.136.1:8081';
const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(targetUrl)}`;
const destPath = 'C:\\Users\\tejas\\.gemini\\antigravity-ide\\brain\\e7824918-3870-4630-8624-7612a41d7125\\qr_expo_go.png';

const file = fs.createWriteStream(destPath);
https.get(qrApiUrl, (res) => {
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log(`✅ Expo QR Code Image Saved to: ${destPath}`);
  });
}).on('error', (err) => {
  console.error('Error downloading QR code:', err);
});
