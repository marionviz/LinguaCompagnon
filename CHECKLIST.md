# ✅ Checklist de vérification - LinguaCompagnon

Utilisez cette checklist pour vous assurer que tout fonctionne correctement.

## 📋 Avant de commencer

- [ ] Node.js version 18+ installé
- [ ] npm installé (vient avec Node.js)
- [ ] Clé API Google Gemini obtenue
- [ ] Accès à un Moodle pour tester

## 🔧 Installation locale

- [ ] Projet dézippé
- [ ] `npm install` exécuté sans erreur
- [ ] Fichier `.env.local` créé
- [ ] Clé API ajoutée dans `.env.local`
- [ ] `npm run dev` lance l'application
- [ ] Application accessible sur http://localhost:3000
- [ ] L'interface s'affiche correctement
- [ ] Le sélecteur de semaine fonctionne
- [ ] Je peux envoyer un message
- [ ] L'IA répond correctement

## 🏗️ Build et test

- [ ] `npm run build` s'exécute sans erreur
- [ ] Dossier `dist/` créé
- [ ] `npm run preview` lance la version buildée
- [ ] Version buildée accessible sur http://localhost:4173
- [ ] Tout fonctionne comme en développement

## 📦 Package SCORM

- [ ] `npm run build:scorm` s'exécute sans erreur
- [ ] Fichier `linguacompagnon-scorm.zip` créé
- [ ] Le ZIP contient `imsmanifest.xml` à la racine
- [ ] Le ZIP contient `index.html` à la racine
- [ ] Le ZIP contient le dossier `assets/`

### Vérification manuelle du ZIP

Dézippez `linguacompagnon-scorm.zip` dans un dossier temporaire et vérifiez :

- [ ] `imsmanifest.xml` est À LA RACINE (pas dans un sous-dossier)
- [ ] `index.html` est À LA RACINE
- [ ] Dossier `assets/` présent avec fichiers `.js` et `.css`
- [ ] Pas de dossier parent inutile

## 🎓 Intégration Moodle

- [ ] Connexion Moodle réussie
- [ ] Cours créé ou sélectionné
- [ ] Mode édition activé
- [ ] "Ajouter une activité" > "Paquetage SCORM" sélectionné
- [ ] Fichier `linguacompagnon-scorm.zip` uploadé
- [ ] Nom et description ajoutés
- [ ] Paramètres d'affichage configurés
- [ ] Activité enregistrée

## 🧪 Tests dans Moodle

- [ ] L'activité SCORM apparaît dans le cours
- [ ] Clic sur l'activité ouvre l'application
- [ ] L'interface s'affiche correctement
- [ ] Le sélecteur de semaine fonctionne
- [ ] Je peux écrire un message
- [ ] L'IA répond correctement
- [ ] Les corrections s'affichent bien
- [ ] Pas d'erreur dans la console (F12)

## 🐛 En cas de problème

### L'IA ne répond pas dans Moodle

- [ ] Vérifié que la clé API est bien intégrée dans le build
- [ ] Vérifié les restrictions réseau de Moodle
- [ ] Contacté l'administrateur Moodle si nécessaire
- [ ] Consulté GUIDE_MOODLE_SCORM.md section Dépannage

### Le package SCORM est rejeté

- [ ] Vérifié que `imsmanifest.xml` est à la racine
- [ ] Re-créé le ZIP en sélectionnant les fichiers (pas le dossier)
- [ ] Testé avec un outil de validation SCORM

### Erreurs JavaScript

- [ ] Ouvert la console du navigateur (F12)
- [ ] Noté les messages d'erreur
- [ ] Vérifié que les chemins dans `vite.config.ts` sont corrects (`base: './'`)
- [ ] Re-fait le build et le package

## 📝 Notes

**Date du dernier test** : _______________

**Version Node.js** : _______________

**Version npm** : _______________

**Navigateur testé** : _______________

**Version Moodle** : _______________

**Problèmes rencontrés** :

---

**Tout fonctionne ?** 🎉 Félicitations ! Vous êtes prêt(e) à utiliser LinguaCompagnon avec vos apprenants !

**Des problèmes ?** 🔧 Consultez le [GUIDE_MOODLE_SCORM.md](./GUIDE_MOODLE_SCORM.md) section Dépannage.
