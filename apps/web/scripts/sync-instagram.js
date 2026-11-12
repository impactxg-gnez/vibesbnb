#!/usr/bin/env node

/**
 * Script to automatically sync the latest actual posts & media from @vibesbnb
 * Usage: node scripts/sync-instagram.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');

const dir = path.join(__dirname, '..', 'public', 'instagram');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed with status code: ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

(async () => {
  console.log('Fetching live Instagram feed for @vibesbnb...');
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1200 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    await page.goto('https://www.instagram.com/vibesbnb/?hl=en', { waitUntil: 'networkidle2', timeout: 35000 });

    const avatarSrc = await page.evaluate(() => {
      const img = document.querySelector('header img');
      return img ? img.src : null;
    });

    if (avatarSrc) {
      await downloadFile(avatarSrc, path.join(dir, 'profile.jpg'));
      console.log('✓ Profile picture synced');
    }

    const posts = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('main a[href*="/p/"], main a[href*="/reel/"]'));
      return links.map(a => {
        const img = a.querySelector('img');
        return {
          href: a.href,
          src: img ? img.src : null,
          alt: img ? img.alt : '',
          isReel: a.href.includes('/reel/')
        };
      }).filter(p => p.src);
    });

    console.log(`Found ${posts.length} actual posts on profile.`);

    for (let i = 0; i < posts.length; i++) {
      const p = posts[i];
      const filename = `post-${i + 1}.jpg`;
      const filepath = path.join(dir, filename);
      try {
        await downloadFile(p.src, filepath);
        p.localImage = `/instagram/${filename}`;
        console.log(`✓ Downloaded ${filename}`);
      } catch (err) {
        console.warn(`Could not download ${filename}:`, err.message);
      }
    }

    fs.writeFileSync(path.join(dir, 'posts.json'), JSON.stringify(posts, null, 2));
    console.log('✓ posts.json updated successfully!');
  } catch (err) {
    console.error('Error during Instagram sync:', err);
  } finally {
    await browser.close();
  }
})();
