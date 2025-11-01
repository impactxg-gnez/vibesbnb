// Migration Script: localStorage → Firebase
// Run this in your browser console on https://vibesbnb.vercel.app

async function migrateLocalStorageToFirebase() {
  const signups = JSON.parse(localStorage.getItem('earlyAccessSignups') || '[]');
  
  if (signups.length === 0) {
    console.log('❌ No signups found in localStorage');
    return;
  }
  
  console.log(`📦 Found ${signups.length} signup(s) in localStorage:`);
  console.table(signups);
  
  console.log('\n🚀 Starting migration to Firebase...\n');
  
  for (const signup of signups) {
    try {
      const response = await fetch('https://vibesbnb-api-ytgu7naeyq-uc.a.run.app/api/v1/early-access/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signup)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Migrated: ${signup.name} (${signup.category}) → Document ID: ${result.id}`);
      } else {
        const error = await response.json();
        console.log(`⚠️ ${signup.name}: ${error.message}`);
      }
    } catch (error) {
      console.error(`❌ Failed to migrate ${signup.name}:`, error);
    }
  }
  
  console.log('\n✨ Migration complete!');
  console.log('🔍 Verify at: https://console.firebase.google.com/u/0/project/vibesbnb-api-476309/firestore');
}

// Run migration
migrateLocalStorageToFirebase();

