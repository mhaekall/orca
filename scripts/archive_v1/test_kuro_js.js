const fs = require('fs');
const https = require('https');

https.get('https://kuronime.sbs/nonton-sousou-no-frieren-episode-5/', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const reqIdMatch = data.match(/var\s+[a-zA-Z0-9_]+\s*=\s*["']([^"']{100,})["']/);
        if (reqIdMatch) {
            console.log("Req ID found:", reqIdMatch[1].substring(0, 20) + "...");
        } else {
            console.log("Req ID NOT found");
        }
    });
});
