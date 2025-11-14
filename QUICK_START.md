# Quick Start Guide

## Test Puppeteer Scraper Now! 🚀

### 1. Start Dev Server

```bash
npm run dev
```

### 2. Open Browser

Navigate to: `http://localhost:3000/host/properties`

### 3. Import Property

1. Click **"Import from URL"** button
2. Paste an Airbnb URL (example below)
3. Click **"Import Property"**
4. Wait 3-5 seconds
5. See the results!

### Example Airbnb URLs to Test:

```
https://www.airbnb.com/rooms/12345678
https://www.airbnb.com/rooms/123456789
https://www.airbnb.com/rooms/51678484
```

(Use any real Airbnb listing URL)

### Expected Result:

You should see:
```
🚀 Browser automation (4.5s)
✅ Imported: 25 photos, 15 amenities, 6 guests, 3 bedrooms, 2 bathrooms
Review and publish!
```

### Check Console (F12):

You should see logs like:
```
[Scraper] Starting scrape for: https://...
[Scraper] Using Puppeteer (browser automation)
[Puppeteer] Navigating to: https://...
[Puppeteer] Scrolling to load images...
[Puppeteer] Extracting data...
[Puppeteer] Extracted: 25 images, 15 amenities
[Scraper] Completed in 4523ms
```

### View Imported Property:

The property card will show:
- 📷 Photo count (e.g., "25 photos")
- 🛏️ Bedrooms, bathrooms, beds
- 👥 Guest capacity
- ✨ Amenities preview
- 📍 Google Maps link
- Beautiful high-quality images

---

## What's Happening Behind the Scenes?

1. **Browser Launch**: Puppeteer starts a headless Chrome browser
2. **Navigation**: Goes to the Airbnb listing page
3. **Wait**: Waits for JavaScript to execute and content to load
4. **Scroll**: Auto-scrolls 20 times to load ALL lazy images
5. **Extract**: Grabs all data (images, amenities, rooms, etc.)
6. **Close**: Closes the page (browser stays running for next request)
7. **Return**: Sends clean, structured data to your app

---

## Troubleshooting

### "Importing..." takes too long
- First run may take longer (Chromium download)
- Subsequent runs are faster (browser reuse)
- Max wait: 30 seconds, then automatic fallback

### No images found
- Check console logs for errors
- Try a different Airbnb URL
- Scraper falls back to Cheerio automatically

### Error messages
- Check console for detailed logs
- Most errors trigger automatic fallback to Cheerio
- Contact support if persistent issues

---

## API Testing (Optional)

Test the API directly:

```bash
curl -X POST http://localhost:3000/api/scrape-property \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.airbnb.com/rooms/12345678"}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "name": "Beautiful Beach House",
    "images": ["url1", "url2", ...],
    "bedrooms": 3,
    "bathrooms": 2,
    ...
  },
  "meta": {
    "scrapingMethod": "puppeteer",
    "duration": 4523
  }
}
```

---

## Next Steps

Once you've tested successfully:
1. ✅ Try multiple Airbnb URLs
2. ✅ Check that all data is extracted correctly
3. ✅ Verify images are loading in property cards
4. ✅ Test Google Maps links
5. ✅ Review amenities lists

---

## Need Help?

- **Technical Details**: See `PUPPETEER_IMPLEMENTATION.md`
- **Full Guide**: See `SCRAPER_GUIDE.md`
- **Summary**: See `IMPLEMENTATION_COMPLETE.md`

**Happy scraping!** 🎉

