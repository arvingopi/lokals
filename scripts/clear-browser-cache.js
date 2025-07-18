// Script to clear browser localStorage and sessionStorage
// Run this in the browser console to clear old data

console.log('🧹 Clearing browser cache and storage...');

// Clear localStorage
if (typeof localStorage !== 'undefined') {
  console.log('📦 Clearing localStorage...');
  localStorage.clear();
  console.log('✅ localStorage cleared');
}

// Clear sessionStorage
if (typeof sessionStorage !== 'undefined') {
  console.log('📦 Clearing sessionStorage...');
  sessionStorage.clear();
  console.log('✅ sessionStorage cleared');
}

// Clear IndexedDB (if used)
if ('indexedDB' in window) {
  console.log('📦 Clearing IndexedDB...');
  indexedDB.databases().then(databases => {
    databases.forEach(db => {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    });
  });
  console.log('✅ IndexedDB cleared');
}

console.log('🎉 Browser cache cleared! Please refresh the page.');
console.log('💡 Or you can:');
console.log('   - Press Ctrl+Shift+R (or Cmd+Shift+R on Mac) for hard refresh');
console.log('   - Open DevTools > Application > Storage > Clear Storage');
console.log('   - Use incognito/private browsing window');