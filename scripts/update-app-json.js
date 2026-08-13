const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '../app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Update android background color
appJson.expo.android.adaptiveIcon.backgroundColor = "#0f172a"; // Matching our dark navy background

// Update splash screen background color
const splashPluginIndex = appJson.expo.plugins.findIndex(p => Array.isArray(p) && p[0] === 'expo-splash-screen');
if (splashPluginIndex !== -1) {
  appJson.expo.plugins[splashPluginIndex][1].backgroundColor = "#0f172a";
  if (appJson.expo.plugins[splashPluginIndex][1].dark) {
    appJson.expo.plugins[splashPluginIndex][1].dark.backgroundColor = "#0f172a";
  }
}

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
console.log('app.json updated');
