#!/usr/bin/env node

/**
 * Script pour créer automatiquement un package SCORM
 * Usage: node build-scorm.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Construction du package SCORM pour Moodle...\n');

// Étape 1 : Build de l'application
console.log('📦 Étape 1/4 : Build de l'application Vite...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build terminé\n');
} catch (error) {
  console.error('❌ Erreur lors du build');
  process.exit(1);
}

// Étape 2 : Créer le dossier SCORM
console.log('📂 Étape 2/4 : Préparation du dossier SCORM...');
const scormDir = path.join(__dirname, 'scorm-package');

// Supprimer le dossier s'il existe déjà
if (fs.existsSync(scormDir)) {
  fs.rmSync(scormDir, { recursive: true, force: true });
}

// Créer le nouveau dossier
fs.mkdirSync(scormDir, { recursive: true });
console.log('✅ Dossier créé\n');

// Étape 3 : Copier les fichiers buildés
console.log('📋 Étape 3/4 : Copie des fichiers...');

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    files.forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Copier le contenu de dist/
const distDir = path.join(__dirname, 'dist');
copyRecursive(distDir, scormDir);

// Copier imsmanifest.xml
const manifestSrc = path.join(__dirname, 'imsmanifest.xml');
const manifestDest = path.join(scormDir, 'imsmanifest.xml');
fs.copyFileSync(manifestSrc, manifestDest);

console.log('✅ Fichiers copiés\n');

// Étape 4 : Créer le ZIP (nécessite zip sur le système)
console.log('🗜️  Étape 4/4 : Création du fichier ZIP...');
const zipName = 'linguacompagnon-scorm.zip';
const zipPath = path.join(__dirname, zipName);

// Supprimer le ZIP s'il existe déjà
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

try {
  // Commande différente selon l'OS
  if (process.platform === 'win32') {
    // Windows : utilise PowerShell
    execSync(`powershell Compress-Archive -Path "${scormDir}\\*" -DestinationPath "${zipPath}"`, { stdio: 'inherit' });
  } else {
    // Mac/Linux : utilise zip
    execSync(`cd "${scormDir}" && zip -r "../${zipName}" *`, { stdio: 'inherit' });
  }
  console.log('✅ ZIP créé\n');
} catch (error) {
  console.log('⚠️  Impossible de créer le ZIP automatiquement.');
  console.log('📝 Veuillez créer manuellement le ZIP :');
  console.log(`   1. Allez dans le dossier: ${scormDir}`);
  console.log(`   2. Sélectionnez TOUS les fichiers`);
  console.log(`   3. Créez un fichier ZIP nommé: ${zipName}\n`);
}

console.log('🎉 Package SCORM prêt !');
console.log(`📦 Fichier : ${zipName}`);
console.log(`📂 Dossier source : scorm-package/`);
console.log('\n💡 Prochaines étapes :');
console.log('   1. Uploadez linguacompagnon-scorm.zip dans Moodle');
console.log('   2. Suivez le guide GUIDE_MOODLE_SCORM.md\n');
