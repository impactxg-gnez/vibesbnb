# 📦 ZIP Upload Guide - Easiest Way to Bulk Upload Properties with Images!

## Why Use ZIP Upload?

Instead of hosting images online and using URLs, you can simply:
1. Put all your property images in a folder
2. Create a simple CSV file
3. ZIP them together
4. Upload once!

The system will automatically extract images and upload them to hosting for you. No need to manually upload images or find image URLs! 🎉

## 📁 ZIP File Structure

Your ZIP file should contain:
```
my-properties.zip
├── properties.csv          (or any .csv filename)
└── images/                 (folder containing all images)
    ├── cabin1.jpg
    ├── cabin2.jpg
    ├── villa1.jpg
    ├── villa2.jpg
    ├── loft1.jpg
    └── ...
```

## 📋 CSV Format for ZIP Upload

Use the `image_files` column instead of `image_urls`:

```csv
name,bedrooms,amenities,wellness_friendly,image_files
Mountain View Cabin,3,WiFi|Kitchen|Hot Tub,yes,cabin1.jpg|cabin2.jpg
Beachfront Villa,4,WiFi|Kitchen|Pool,yes,villa1.jpg|villa2.jpg
```

### Columns:

| Column | Description | Example |
|--------|-------------|---------|
| `name` | Property name | Mountain View Cabin |
| `bedrooms` | Number of bedrooms | 3 |
| `amenities` | Pipe-separated amenities | WiFi\|Kitchen\|Pool |
| `wellness_friendly` | yes/no or true/false | yes |
| `image_files` | Pipe-separated filenames | cabin1.jpg\|cabin2.jpg |

## 🎯 Step-by-Step Guide

### Step 1: Organize Your Images

Create a folder called `images` and put all your property photos in it:
```
images/
├── cabin1.jpg
├── cabin2.jpg
├── villa1.jpg
├── villa2.jpg
└── ...
```

**Tips:**
- Use descriptive filenames (e.g., `mountain-cabin-exterior.jpg`)
- Supported formats: JPG, JPEG, PNG, GIF, WebP
- Recommended size: 800x600 or larger
- Keep file sizes reasonable (< 5MB each)

### Step 2: Create Your CSV File

Create a CSV file (e.g., `properties.csv`) with your property data:

```csv
name,bedrooms,amenities,wellness_friendly,image_files
Mountain View Cabin,3,WiFi|Kitchen|Parking|Hot Tub,yes,cabin1.jpg|cabin2.jpg
Beachfront Villa,4,WiFi|Kitchen|Pool|Air Conditioning,yes,villa1.jpg|villa2.jpg
Urban Loft,2,WiFi|Kitchen|Gym|Workspace,yes,loft1.jpg|loft2.jpg
```

**Important:**
- Filenames in `image_files` must match the actual files in your `images/` folder
- Use `|` to separate multiple image files
- Filenames are case-sensitive

### Step 3: Create the ZIP File

#### Windows:
1. Put your CSV file and `images` folder in the same location
2. Select both the CSV file and `images` folder
3. Right-click → "Send to" → "Compressed (zipped) folder"
4. Name it something like `my-properties.zip`

#### Mac:
1. Put your CSV file and `images` folder in the same location
2. Select both the CSV file and `images` folder
3. Right-click → "Compress 2 items"
4. Rename to `my-properties.zip`

### Step 4: Upload to VibesBNB

1. Log in as admin
2. Go to `/admin/bulk-upload`
3. Click "Show Bulk Import"
4. Select "📦 ZIP (with Images)" tab
5. Upload your ZIP file
6. Review the imported properties
7. Click "Upload All Properties"

## 📦 Example ZIP Contents

Here's what your ZIP should look like when opened:

```
my-properties.zip (unzipped contents):
│
├── properties.csv
│
└── images/
    ├── cabin1.jpg         (for Mountain View Cabin)
    ├── cabin2.jpg         (for Mountain View Cabin)
    ├── villa1.jpg         (for Beachfront Villa)
    ├── villa2.jpg         (for Beachfront Villa)
    ├── loft1.jpg          (for Urban Loft)
    ├── loft2.jpg          (for Urban Loft)
    └── ...
```

## ✅ Valid ZIP Structures

The system is flexible and accepts various structures:

### Option 1: Images in a folder (recommended)
```
my-properties.zip
├── properties.csv
└── images/
    ├── photo1.jpg
    └── photo2.jpg
```

### Option 2: Images at root level
```
my-properties.zip
├── properties.csv
├── photo1.jpg
└── photo2.jpg
```

### Option 3: Images in any subfolder
```
my-properties.zip
├── properties.csv
└── my-photos/
    ├── photo1.jpg
    └── photo2.jpg
```
*Note: If images are in a subfolder other than `images/`, use the full path in CSV: `my-photos/photo1.jpg`*

## 🚨 Common Mistakes to Avoid

❌ **Don't:**
- Put the CSV inside the images folder
- Use spaces in filenames (use hyphens or underscores)
- Forget to include the images folder in the ZIP
- Use different filenames in CSV vs actual files
- Mix up file extensions (`.JPG` vs `.jpg` matters!)

✅ **Do:**
- Keep CSV and images folder at the same level
- Use clear, descriptive filenames
- Double-check filename matches
- Test with a small ZIP first (2-3 properties)
- Use lowercase file extensions

## 🎨 Image Best Practices

### Naming Convention
Good: `mountain-cabin-exterior.jpg`, `villa-pool-view.jpg`  
Bad: `IMG_1234.jpg`, `photo (1).jpg`

### File Sizes
- Ideal: 100KB - 500KB per image
- Maximum: 5MB per image
- Use image compression tools if needed

### Dimensions
- Minimum: 800x600
- Recommended: 1200x800 or 1600x1200
- Aspect ratio: 4:3 or 16:9

### Format
- Best: JPG (smaller file sizes)
- Good: PNG (higher quality, larger files)
- Supported: GIF, WebP

## 🔧 Troubleshooting

### "No CSV file found in ZIP"
- Make sure your CSV file has a `.csv` extension
- Check that it's not inside a subfolder
- Try unzipping and re-zipping

### "Images not loading"
- Verify filenames in CSV match actual files exactly
- Check for case sensitivity (cabin1.jpg ≠ Cabin1.JPG)
- Make sure images are in the `images/` folder or use correct paths

### "Failed to process ZIP file"
- File might be corrupted - try creating a new ZIP
- Check ZIP isn't password protected
- Ensure ZIP isn't too large (< 100MB recommended)

## 💡 Pro Tips

1. **Name images descriptively**: `property-room-view.jpg` instead of `IMG001.jpg`
2. **Compress images first**: Use tools like TinyPNG or ImageOptim before zipping
3. **Test with small batches**: Upload 2-3 properties first to test
4. **Keep a backup**: Save your original ZIP file
5. **Organize by property**: Use clear naming like `cabin-1.jpg`, `cabin-2.jpg`

## 📊 Comparison: CSV vs ZIP

| Feature | CSV (with URLs) | ZIP (with Images) |
|---------|----------------|-------------------|
| Image handling | Manual URLs | Automatic upload |
| Best for | Already hosted images | Local image files |
| File size | Small | Larger |
| Setup time | Need to host images first | Just collect files |
| Ease of use | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 🎉 Ready to Upload?

The ZIP method is perfect if you:
- Have images on your computer
- Want to upload everything at once
- Don't want to deal with image hosting
- Need to bulk upload quickly

Just create your ZIP file with images and CSV, upload it, and you're done! The system handles all the image hosting automatically. 🚀

## 📝 Template Files

We've included template files for you:
- `property-upload-zip-template.csv` - Example CSV for ZIP upload
- See `CSV-UPLOAD-GUIDE.md` for URL-based uploads

Choose whichever method works best for you!

