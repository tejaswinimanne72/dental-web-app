const https = require('https');

function deleteRun(runId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/tejaswinimanne72/dental-web-app/actions/runs/${runId}`,
      method: 'DELETE',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      console.log(`Delete Run ${runId}: HTTP ${res.statusCode}`);
      resolve(res.statusCode);
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

async function main() {
  // Attempt to delete old failed runs: 31362458414, 31362458900, etc.
  const failedRunIds = ['31362458414', '31362458900'];
  for (const id of failedRunIds) {
    await deleteRun(id);
  }
}

main();
