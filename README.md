# LinguaCompagnon - Tuteur Conversationnel IA

> Application React + TypeScript + Google Gemini AI pour l'apprentissage du français

## 🎯 Description

LinguaCompagnon est un tuteur conversationnel intelligent qui accompagne les apprenants adultes dans leur apprentissage du français entre les cours synchrones. L'application utilise Google Gemini AI pour fournir :

- ✅ Pratique conversationnelle personnalisée par semaine
- ✅ Corrections formatives avec explications
- ✅ Adaptation au niveau de l'apprenant
- ✅ Suivi du programme sur 11 semaines

## 📚 Contexte pédagogique

Développé dans le cadre du Master Ingénierie Pédagogique Multimodale (IPM) - Université de Lille, pour l'Organisation des Nations Unies à Genève.

## 🚀 Démarrage rapide

### Installation locale

```bash
# Installer les dépendances
npm install

# Configurer la clé API dans .env.local
GEMINI_API_KEY=votre_clé_ici

# Lancer en mode développement
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

### Build pour production

```bash
# Build simple
npm run build

# Build + Package SCORM pour Moodle
npm run build:scorm
```

## 📦 Intégration dans Moodle (SCORM)

**Consultez le guide complet** : [GUIDE_MOODLE_SCORM.md](./GUIDE_MOODLE_SCORM.md)

**Résumé rapide** :

1. `npm run build:scorm` → Crée `linguacompagnon-scorm.zip`
2. Dans Moodle : Ajouter > Paquetage SCORM
3. Uploader le fichier ZIP
4. Configurer et publier

## 🛠️ Technologies

- **Frontend** : React 19 + TypeScript
- **Build** : Vite
- **IA** : Google Gemini AI (gemini-2.0-flash)
- **Styling** : Tailwind CSS
- **LMS** : Package SCORM 1.2

## 📂 Structure du projet

```
linguacompagnon-scorm/
├── src/
│   ├── components/          # Composants React
│   │   ├── ChatMessage.tsx
│   │   ├── ChatInput.tsx
│   │   └── WeekSelector.tsx
│   ├── services/
│   │   └── geminiService.ts # Configuration AI et thèmes
│   ├── App.tsx              # Composant principal
│   ├── index.tsx            # Point d'entrée
│   ├── types.ts             # Types TypeScript
│   └── index.css            # Styles globaux
├── imsmanifest.xml          # Manifest SCORM
├── package.json
├── vite.config.ts
├── tsconfig.json
├── build-scorm.js           # Script de packaging
├── GUIDE_MOODLE_SCORM.md    # Guide d'intégration
└── README.md
```

## 🎓 Thèmes par semaine

L'application couvre 11 semaines de formation :

1. Se présenter, salutations
2. Famille et professions
3. Activités quotidiennes
4. Au restaurant
5. Shopping et vêtements
6. La ville et directions
7. Vacances (passé composé avec avoir)
8. Événements passés (passé composé avec être)
9. Souvenirs (imparfait)
10. Projets futurs
11. Hypothèses et conseils (conditionnel)

## ⚙️ Configuration

### Variables d'environnement

Créez un fichier `.env.local` :

```
GEMINI_API_KEY=votre_clé_api_google_gemini
```

### Obtenir une clé API

1. Allez sur https://aistudio.google.com/apikey
2. Créez ou copiez votre clé API
3. Collez-la dans `.env.local`

## 🔧 Scripts disponibles

- `npm run dev` - Lance le serveur de développement
- `npm run build` - Build pour la production
- `npm run preview` - Prévisualise le build
- `npm run build:scorm` - Crée le package SCORM complet

## 📝 Personnalisation

### Modifier les thèmes

Éditez `src/services/geminiService.ts` pour changer :
- Le vocabulaire par semaine
- Les points de grammaire
- Les contextes communicationnels

### Modifier l'apparence

Les composants utilisent Tailwind CSS. Modifiez les classes directement dans les composants.

## 🐛 Dépannage

### L'IA ne répond pas

**Solution** : Vérifiez que votre clé API est correctement configurée dans `.env.local`

### Le package SCORM ne fonctionne pas dans Moodle

**Solutions** :
1. Vérifiez que `imsmanifest.xml` est à la racine du ZIP
2. Vérifiez les permissions réseau de Moodle
3. Consultez le [guide complet](./GUIDE_MOODLE_SCORM.md)

### Erreur de build

```bash
# Nettoyer et réinstaller
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📞 Support

**Questions pédagogiques** :
- Marion Vizier-Marzais : marionviz@hotmail.com

**Questions techniques** :
- Consultez [GUIDE_MOODLE_SCORM.md](./GUIDE_MOODLE_SCORM.md)
- Documentation Google Gemini : https://ai.google.dev/docs

## 📄 Licence

Projet académique - Master IPM Lille 2025

## 🙏 Remerciements

- Université de Lille - Master IPM
- Organisation des Nations Unies (Genève)
- Google Gemini AI

---

**Fait avec ❤️ pour l'apprentissage des langues**
