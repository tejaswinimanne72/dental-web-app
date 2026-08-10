const https = require('https');

function getRunJobs(runId) {
  const options = {
    hostname: 'api.github.com',
    path: `/repos/tejaswinimanne72/dental-web-app/actions/runs/${runId}/jobs`,
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
        console.log(`=== JOBS FOR RUN ${runId} ===`);
        json.jobs.forEach(j => {
          console.log(`Job: ${j.name} | Status: ${j.status} | Conclusion: ${j.conclusion}`);
          j.steps.forEach(s => {
            console.log(`  - Step: ${s.name} | Conclusion: ${s.conclusion}`);
          });
        });
      } catch(e) {
        console.error('Error:', e);
      }
    });
  });
}

getRunJobs('31362458900');
getRunJobs('31362458414');
