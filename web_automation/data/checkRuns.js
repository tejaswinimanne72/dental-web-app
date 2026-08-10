const https = require('https');

const options = {
  hostname: 'api.github.com',
  path: '/repos/tejaswinimanne72/dental-web-app/actions/runs',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'application/vnd.github.v3+json'
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.workflow_runs) {
        console.log(`Total Runs on dental-web-app: ${json.total_count}`);
        json.workflow_runs.forEach(r => {
          console.log(`- [${r.id}] ${r.name} | Status: ${r.status} | Conclusion: ${r.conclusion}`);
        });
      } else {
        console.log('GitHub API Message:', json.message);
      }
    } catch(e) {
      console.error('Error parsing response:', e);
    }
  });
});
