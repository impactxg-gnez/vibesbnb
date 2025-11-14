# CSV Upload Guide for Bulk Property Upload

## 📋 Required CSV Format

Your CSV file must have these **5 columns** in this exact order:

```
name,bedrooms,amenities,wellness_friendly,image_urls
```

## 📊 Column Details

### 1. **name** (Required)
- Property name
- Example: `Mountain View Cabin`, `Beachfront Villa`

### 2. **bedrooms** (Required)
- Number of bedrooms (must be a number)
- Example: `2`, `3`, `5`

### 3. **amenities** (Required)
- Pipe-separated list of amenities
- Use the `|` symbol to separate multiple amenities
- Example: `WiFi|Kitchen|Pool|Hot Tub`

**Available Amenities:**
- WiFi
- Kitchen
- Parking
- Pool
- Hot Tub
- Gym
- Air Conditioning
- Heating
- TV
- Washer/Dryer
- Pet Friendly
- Workspace
- Fireplace
- Beach Access
- Lake View
- Mountain Views
- Sauna
- Gardens
- Stargazing Deck
- Ski Access
- And more...

### 4. **wellness_friendly** (Required)
- Indicates if property allows wellness practices
- Accepted values: `yes`, `no`, `true`, `false` (case insensitive)
- Example: `yes` or `true`

### 5. **image_urls** (Required)
- Pipe-separated list of image URLs
- Use the `|` symbol to separate multiple images
- Must be direct links to images
- Example: `https://example.com/image1.jpg|https://example.com/image2.jpg`

**Image URL Tips:**
- ✅ Use direct image URLs from Unsplash, Imgur, or your own hosting
- ✅ Multiple images: separate with `|` symbol
- ✅ Recommended format: `?w=800&h=600&fit=crop` for optimal sizing
- ❌ Don't use shortened URLs or URLs that redirect

## 📝 Example CSV

```csv
name,bedrooms,amenities,wellness_friendly,image_urls
Mountain View Cabin,3,WiFi|Kitchen|Parking|Hot Tub,yes,https://images.unsplash.com/photo-1587061949409?w=800|https://images.unsplash.com/photo-1542718610?w=800
Beachfront Villa,4,WiFi|Kitchen|Pool,yes,https://images.unsplash.com/photo-1499793983690?w=800
```

## 🎯 How to Create Your CSV

### Option 1: Excel/Google Sheets
1. Create a spreadsheet with the 5 columns
2. Fill in your property data
3. For multiple amenities: use `|` as separator
4. For multiple images: use `|` as separator
5. Save as CSV format

### Option 2: Download Template
1. Go to `/admin/bulk-upload`
2. Click "Show CSV Upload"
3. Click "Download Template"
4. Edit the template with your data
5. Upload when ready

## 🚀 Upload Process

1. Log in as admin
2. Navigate to `/admin/bulk-upload`
3. Click "Show CSV Upload"
4. Upload your CSV file
5. Review the imported properties
6. Images from URLs will be automatically previewed
7. Click "Upload All Properties" to save

## ⚠️ Common Mistakes to Avoid

❌ **Don't:**
- Use commas in property names or amenities (breaks CSV format)
- Forget the `image_urls` column
- Leave required fields empty
- Use different column names or order

✅ **Do:**
- Keep exact column names (lowercase)
- Use `|` for separating multiple items
- Provide valid image URLs
- Test with a small CSV first

## 🔧 Troubleshooting

**"CSV must have columns..." error:**
- Make sure all 5 columns are present
- Check spelling (lowercase, underscore for `image_urls`, `wellness_friendly`)

**Images not showing:**
- Verify URLs are direct links to images
- Check if URLs are publicly accessible
- Make sure URLs don't require authentication

**Properties not loading:**
- Check for empty rows in CSV
- Ensure no special characters in data
- Verify CSV is properly formatted

## 📦 Sample Template File

Use the included `property-upload-template.csv` as a reference. It contains 15 example properties with:
- Various property types
- Different amenity combinations
- Working Unsplash image URLs
- Mix of wellness-friendly and non-wellness properties

Simply edit this file with your own data and upload!

## 💡 Pro Tips

1. **Bulk Image URLs**: Use a tool like Unsplash or Pexels API to get multiple image URLs quickly
2. **Consistent Formatting**: Keep amenity names consistent across all properties
3. **Test First**: Upload a small CSV with 2-3 properties to test before bulk upload
4. **Backup**: Keep your CSV file as a backup of your property data
5. **Image Optimization**: Use the `?w=800&h=600&fit=crop` parameters for consistent image sizes

## 🎉 Ready to Upload?

You now have everything you need to bulk upload properties! If you run into any issues, check this guide or download the template for reference.

Happy uploading! 🏠✨

