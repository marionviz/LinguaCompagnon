# 🚀 Guide Complet - LinguaCompagnon pour Moodle (SCORM)

## 📋 Vue d'ensemble

Ce guide vous explique comment :
1. ✅ Tester l'application localement
2. ✅ Builder pour la production
3. ✅ Créer le package SCORM
4. ✅ Intégrer dans Moodle

---

## 🛠️ PARTIE 1 : Installation et test local

### Prérequis

- **Node.js** version 18+ ([Télécharger](https://nodejs.org/))
- **npm** (inclus avec Node.js)
- Un éditeur de code (VS Code recommandé)
- Votre **clé API Google Gemini**

### Étape 1 : Configuration initiale

1. **Dézippez** le dossier `linguacompagnon-scorm`

2. **Ouvrez** un terminal dans ce dossier

3. **Installez** les dépendances :
   ```bash
   npm install
   ```

### Étape 2 : Configuration de la clé API

1. **Ouvrez** le fichier `.env.local`

2. **Remplacez** `PLACEHOLDER_API_KEY` par votre vraie clé API :
   ```
   GEMINI_API_KEY=AIza...votre_vraie_clé...
   ```

3. **Sauvegardez** le fichier

💡 **Où trouver votre clé API ?**
- Allez sur : https://aistudio.google.com/apikey
- Créez ou copiez votre clé API

### Étape 3 : Lancer en mode développement

```bash
npm run dev
```

L'application s'ouvrira automatiquement sur : `http://localhost:3000`

✅ **Testez** que tout fonctionne :
- Sélectionnez une semaine
- Envoyez un message
- Vérifiez que l'IA répond

---

## 📦 PARTIE 2 : Build pour la production

### Étape 1 : Compiler l'application

```bash
npm run build
```

Cela crée un dossier `dist/` avec tous les fichiers optimisés.

### Étape 2 : Tester le build

```bash
npm run preview
```

Vérifiez que tout fonctionne sur : `http://localhost:4173`

---

## 📚 PARTIE 3 : Créer le package SCORM pour Moodle

### Méthode A : Manuelle (Recommandée)

#### Étape 1 : Préparer les fichiers

1. Après avoir fait `npm run build`, vous avez un dossier `dist/`

2. **Créez** un nouveau dossier appelé `linguacompagnon-scorm-package`

3. **Copiez** le contenu du dossier `dist/` dans `linguacompagnon-scorm-package/`

4. **Copiez** le fichier `imsmanifest.xml` (à la racine du projet) dans `linguacompagnon-scorm-package/`

#### Étape 2 : Vérifier la structure

Votre dossier `linguacompagnon-scorm-package/` doit ressembler à :

```
linguacompagnon-scorm-package/
├── imsmanifest.xml          ← OBLIGATOIRE pour SCORM
├── index.html               ← Point d'entrée
├── assets/
│   ├── index-xxxxx.js      ← JavaScript buildé
│   └── index-xxxxx.css     ← CSS buildé
└── (autres fichiers...)
```

⚠️ **IMPORTANT** : Le fichier `imsmanifest.xml` DOIT être à la racine !

#### Étape 3 : Créer l'archive ZIP

**Sur Windows :**
1. Sélectionnez TOUS les fichiers DANS le dossier `linguacompagnon-scorm-package/`
2. Clic droit > "Envoyer vers" > "Dossier compressé"
3. Nommez-le : `linguacompagnon-scorm.zip`

**Sur Mac/Linux :**
```bash
cd linguacompagnon-scorm-package
zip -r ../linguacompagnon-scorm.zip *
```

⚠️ **CRITIQUE** : Les fichiers doivent être À LA RACINE du ZIP, pas dans un sous-dossier !

---

## 🎓 PARTIE 4 : Intégrer dans Moodle

### Étape 1 : Uploader le package SCORM

1. **Connectez-vous** à votre Moodle

2. **Allez** dans votre cours

3. **Activez** le mode édition (bouton "Activer le mode édition")

4. **Cliquez** sur "Ajouter une activité ou une ressource"

5. **Sélectionnez** "Paquetage SCORM"

6. **Cliquez** "Ajouter"

### Étape 2 : Configuration du SCORM

1. **Nom** : `LinguaCompagnon - Pratique du Français`

2. **Description** : 
   ```
   Tuteur conversationnel IA pour pratiquer le français entre les cours synchrones.
   Choisissez votre semaine de formation et pratiquez !
   ```

3. **Fichier paquetage** : 
   - Glissez-déposez `linguacompagnon-scorm.zip`
   - OU cliquez "Choisir un fichier" et sélectionnez le ZIP

4. **Paramètres d'affichage** (recommandés) :
   - **Mode d'affichage** : "Nouvelle fenêtre"
   - **Largeur** : 100%
   - **Hauteur** : 600px (ou plus selon vos préférences)

5. **Options de notes** :
   - **Type de note** : Aucune (LinguaCompagnon ne note pas)

6. **Cliquez** sur "Enregistrer et afficher"

### Étape 3 : Tester dans Moodle

1. **Cliquez** sur l'activité SCORM que vous venez de créer

2. **Vérifiez** que :
   - ✅ L'interface s'affiche correctement
   - ✅ Vous pouvez sélectionner une semaine
   - ✅ Vous pouvez envoyer des messages
   - ✅ L'IA répond correctement

---

## 🔧 PARTIE 5 : Dépannage

### Problème : "Le package SCORM ne peut pas être ouvert"

**Cause** : Structure du ZIP incorrecte

**Solution** :
1. Dézippez votre fichier SCORM
2. Vérifiez que `imsmanifest.xml` est À LA RACINE (pas dans un sous-dossier)
3. Re-zippez en sélectionnant tous les fichiers (pas le dossier parent)

### Problème : "L'application ne se charge pas"

**Cause** : Chemins incorrects dans le build

**Solution** :
1. Dans `vite.config.ts`, vérifiez que vous avez :
   ```typescript
   base: './',  // Chemins relatifs
   ```
2. Refaites le build : `npm run build`
3. Re-créez le package SCORM

### Problème : "L'IA ne répond pas"

**Causes possibles** :
1. ❌ La clé API n'est pas correctement intégrée dans le build
2. ❌ Restrictions réseau de Moodle/navigateur

**Solution pour la clé API** :
La clé API doit être "hard-codée" dans le build pour SCORM.

**Modifiez** `src/App.tsx`, ligne 25 environ :
```typescript
// AVANT (ne fonctionne pas en SCORM)
if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// APRÈS (pour SCORM)
const ai = new GoogleGenAI({ apiKey: 'AIza...VOTRE_VRAIE_CLÉ_ICI...' });
```

⚠️ **ATTENTION** : En mettant la clé directement dans le code, elle sera visible dans le code source. C'est acceptable pour un usage interne Moodle, mais **NE PUBLIEZ PAS** ce code publiquement.

### Problème : "Impossible d'envoyer des messages dans Moodle"

**Cause** : Politique de sécurité (CORS/CSP) de Moodle

**Solution** :
1. Contactez votre administrateur Moodle
2. Demandez l'autorisation des appels API vers `generativelanguage.googleapis.com`
3. Vérifiez que JavaScript et les iframes sont autorisés

---

## 📊 PARTIE 6 : Personnalisation

### Modifier les thèmes par semaine

Éditez `src/services/geminiService.ts` pour changer :
- Le vocabulaire
- La grammaire
- Les contextes communicationnels

### Changer l'apparence

Les styles utilisent Tailwind CSS directement dans les composants.

Pour modifier les couleurs principales :
- `indigo-600` → Couleur primaire (boutons, accents)
- `slate-900/800/700` → Couleurs de fond

### Ajouter/Retirer des semaines

Dans `src/services/geminiService.ts` :
1. Ajoutez ou supprimez des entrées dans `weekThemes`
2. Mettez à jour le sélecteur dans `src/components/WeekSelector.tsx`

---

## ✅ Checklist finale

Avant de mettre en production dans Moodle :

☐ J'ai testé localement (`npm run dev`)
☐ J'ai mis ma vraie clé API Gemini
☐ J'ai fait le build (`npm run build`)
☐ J'ai testé le build (`npm run preview`)
☐ J'ai créé le package SCORM avec `imsmanifest.xml` à la racine
☐ Le fichier ZIP contient les fichiers À LA RACINE (pas dans un sous-dossier)
☐ J'ai uploadé dans Moodle et testé
☐ L'IA répond correctement dans Moodle

---

## 📞 Support

**Questions techniques** :
- Vérifiez d'abord la section Dépannage ci-dessus
- Consultez la documentation de votre Moodle
- Contactez votre administrateur Moodle pour les questions de permissions

**Questions pédagogiques** :
- Marion Vizier-Marzais : marionviz@hotmail.com

---

## 📚 Ressources

- [Documentation Google Gemini AI](https://ai.google.dev/docs)
- [Documentation SCORM](https://scorm.com/scorm-explained/)
- [Documentation Moodle SCORM](https://docs.moodle.org/fr/SCORM)
- [Documentation Vite](https://vite.dev/)
- [Documentation React](https://react.dev/)

---

**Fait avec ❤️ pour l'apprentissage des langues - Master IPM Lille 2025**
