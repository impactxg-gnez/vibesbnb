# Check Firebase Signups

## After Running Migration

Once you've run the migration script in your browser console, run these commands to verify:

### PowerShell Commands:

```powershell
# Check all signups
Invoke-RestMethod -Uri "https://vibesbnb-api-ytgu7naeyq-uc.a.run.app/api/v1/early-access/signups" | ConvertTo-Json -Depth 5

# Check just hosts
Invoke-RestMethod -Uri "https://vibesbnb-api-ytgu7naeyq-uc.a.run.app/api/v1/early-access/signups?category=host" | ConvertTo-Json -Depth 5

# Check just travellers
Invoke-RestMethod -Uri "https://vibesbnb-api-ytgu7naeyq-uc.a.run.app/api/v1/early-access/signups?category=traveller" | ConvertTo-Json -Depth 5

# Get statistics
Invoke-RestMethod -Uri "https://vibesbnb-api-ytgu7naeyq-uc.a.run.app/api/v1/early-access/stats" | ConvertTo-Json
```

### Expected Stats Output:

```json
{
  "total": 2,
  "byCategory": {
    "host": 1,
    "traveller": 1,
    "service_host": 0,
    "dispensary": 0
  },
  "recent": [...]
}
```

## Document ID Format

Your signups will have document IDs based on name and phone:

- **Format**: `{sanitized_name}_{sanitized_phone}`
- **Example**: "Keval" with phone "+91498..." becomes `keval_81498...`

## Direct Firebase Console Access

**Collection**: `early_access_signups`

**URL**: https://console.firebase.google.com/u/0/project/vibesbnb-api-476309/firestore/data/~2Fearly_access_signups

## From Now On

✅ **All new signups** will go directly to Firebase (no localStorage needed)
✅ **Custom document IDs** make it easy to find specific users
✅ **API endpoints** are live for querying, stats, and CSV export

## Troubleshooting

### If migration fails:
1. Make sure you're on https://vibesbnb.vercel.app (not localhost)
2. Check browser console for CORS errors
3. Verify API is responding: https://vibesbnb-api-ytgu7naeyq-uc.a.run.app/api/v1/early-access/stats

### If you see duplicate errors:
- This is normal if you run the migration twice
- Firebase prevents duplicates by email+category combination

