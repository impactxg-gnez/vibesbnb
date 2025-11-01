# Firebase Document IDs Update

## Summary
Updated the early-access signup system to use custom document IDs based on the user's name and phone number instead of auto-generated Firebase IDs.

## Document ID Format

### Format
```
{sanitized_name}_{sanitized_phone}
```

### Example
- **Name**: "John Doe"
- **Phone**: "+1 (555) 123-4567"
- **Document ID**: `john_doe_5551234567`

## Implementation Details

### Sanitization Rules

#### Name Sanitization
1. Convert to lowercase
2. Replace all non-alphanumeric characters with underscores
3. Replace multiple consecutive underscores with a single underscore
4. Limit to 50 characters

#### Phone Sanitization
1. Remove all non-numeric characters
2. Limit to 15 characters

### Code Location
**File**: `apps/api/src/early-access/early-access.service.ts`

**Method**: `create()`

```typescript
// Create custom document ID: name_phone (sanitized)
const sanitizedName = createEarlyAccessDto.name
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '_')
  .replace(/_+/g, '_')
  .substring(0, 50);

const sanitizedPhone = createEarlyAccessDto.phone
  .replace(/[^0-9]/g, '')
  .substring(0, 15);

const customDocId = `${sanitizedName}_${sanitizedPhone}`;

// Create signup with custom document ID
const firestore = this.firebaseService.getFirestore();
const docRef = firestore.collection('early_access_signups').doc(customDocId);

await docRef.set({
  ...createEarlyAccessDto,
  timestamp: new Date().toISOString(),
  createdAt: new Date(),
  updatedAt: new Date(),
});
```

## Benefits

### 1. **Human-Readable IDs**
- Easy to identify users at a glance
- Better for debugging and manual inspection
- Searchable by name or phone

### 2. **Automatic Deduplication**
- Same name + phone = same document ID
- Prevents duplicate signups from the same person
- Reduces data redundancy

### 3. **Direct Access**
- Can fetch a specific user directly by name and phone
- No need to query by email or other fields

### 4. **Admin-Friendly**
- Easy to find specific users in Firebase Console
- Quick access for support requests
- Simple data export and analysis

## Firebase Console

### Viewing Signups
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **vibesbnb-api-476309**
3. Navigate to **Firestore Database**
4. Open **early_access_signups** collection
5. Documents will be listed with format: `{name}_{phone}`

### Example Documents
```
john_smith_5551234567
jane_doe_5559876543
sarah_johnson_5551112222
mike_wilson_5552223333
```

## Document Structure

Each document contains:

```typescript
{
  name: string;           // Original name
  email: string;          // Email address
  phone: string;          // Original phone (with formatting)
  category: string;       // 'host' | 'dispensary' | 'service_host' | 'traveller'
  timestamp: string;      // ISO 8601 timestamp
  createdAt: Timestamp;   // Firebase server timestamp
  updatedAt: Timestamp;   // Firebase server timestamp
  
  // Optional fields based on category
  location?: {
    address: string;
    lat: number;
    lng: number;
  };
  serviceHostData?: {
    services: string[];
    serviceAreas: string[];
    pincodes: string[];
  };
  airbnbData?: {
    listingUrl: string;
    propertyName?: string;
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    guests?: number;
  };
}
```

## API Endpoints

### Create Signup
```bash
POST /api/v1/early-access/signup
Content-Type: application/json

{
  "name": "John Smith",
  "email": "john@example.com",
  "phone": "+1 555-123-4567",
  "category": "host"
}

Response:
{
  "success": true,
  "id": "john_smith_5551234567",
  "message": "Successfully signed up for early access"
}
```

### Get All Signups
```bash
GET /api/v1/early-access/signups?category=host
```

### Get Stats
```bash
GET /api/v1/early-access/stats
```

### Export to CSV
```bash
GET /api/v1/early-access/export
```

## Testing

### Production Test (once deployed)
```bash
# Test signup
curl -X POST https://api.vibesbnb.com/api/v1/early-access/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+1234567890",
    "category": "traveller"
  }'

# Expected Response
{
  "success": true,
  "id": "test_user_1234567890",
  "message": "Successfully signed up for early access"
}
```

### Check in Firebase Console
1. Go to Firestore Database
2. Look for document: `test_user_1234567890`
3. Verify all fields are present

## Deployment Status

### Changes Committed
- ✅ Custom document ID generation
- ✅ TypeScript strict null checking fixes
- ✅ Firebase service integration
- ✅ Early-access module complete

### Git Commit
```
commit: feat: add Firebase early-access storage with custom document IDs (name_phone format)
pushed to: main
```

### Auto-Deployment
- Cloud Build will automatically deploy to Cloud Run
- Check deployment status: [Cloud Build History](https://console.cloud.google.com/cloud-build/builds)
- Service: `vibesbnb-api`
- Region: Your configured region

## Next Steps

1. **Monitor Deployment**
   - Watch Cloud Build logs for successful deployment
   - Verify API endpoints are accessible

2. **Test in Production**
   - Submit a test signup through the web app
   - Verify it appears in Firebase with correct document ID

3. **Analytics**
   - Use the stats endpoint to track signups by category
   - Export CSV for analysis

## Troubleshooting

### Issue: Document ID Collision
**Cause**: Two people with the exact same name and phone number
**Solution**: The second signup will overwrite the first (by design)
**Prevention**: Consider adding timestamp to ID if needed

### Issue: Special Characters in Name
**Cause**: Names with emoji, special characters, etc.
**Solution**: Automatically sanitized to underscores

### Issue: International Phone Numbers
**Cause**: Different country codes and formats
**Solution**: All non-numeric characters removed, keeping just digits

