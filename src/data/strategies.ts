// src/data/LearningStrategies.ts
// Stratégies d'apprentissage ciblées par semaine et par type d'erreur

export interface LearningStrategies {
  weekNumber: number;
  errorType: 'grammar' | 'vocabulary' | 'conjugation' | 'pronunciation';
  errorPattern: string; // Ce qui déclenche la stratégie
  strategy: string; // La stratégie courte et visuelle
  example?: string; // Exemple concret
}

export const LEARNING_STRATEGIES: LearningStrategies[] = [
  // ═══════════════════════════════════════════════════════════
  // SEMAINE 1 : RÉVISIONS
  // ═══════════════════════════════════════════════════════════
  {
    weekNumber: 1,
    errorType: 'grammar',
    errorPattern: 'préposition lieu',
    strategy: 'Pays masculins → AU/DU (au Japon, du Brésil). Pays féminins → EN/DE (en France, de Suède). Villes → À/DE (à Paris, de Lyon).',
    example: 'Je vais AU Portugal, EN Italie, À Rome.'
  },
  {
    weekNumber: 1,
    errorType: 'conjugation',
    errorPattern: 'passé composé',
    strategy: 'Passé composé = 2 parties → AVOIR/ÊTRE au présent + participe passé. Astuce : verbes de mouvement avec ÊTRE (aller, venir, partir...).',
    example: 'J\'AI mangé (avoir). Je SUIS allé (être).'
  },
  {
    weekNumber: 1,
    errorType: 'conjugation',
    errorPattern: 'imparfait',
    strategy: 'Imparfait = terminaisons -ais, -ais, -ait, -ions, -iez, -aient. Base : radical du NOUS au présent.',
    example: 'Nous mangeons → je mangeAIS, tu mangeAIS.'
  },
  {
    weekNumber: 1,
    errorType: 'grammar',
    errorPattern: 'comparatif',
    strategy: 'Comparatif = PLUS/MOINS/AUSSI + adjectif + QUE. Superlatif = LE/LA/LES PLUS/MOINS + adjectif.',
    example: 'Plus grand QUE. Le PLUS grand.'
  },
  {
    weekNumber: 1,
    errorType: 'vocabulary',
    errorPattern: 'goûts musicaux',
    strategy: 'Verbes d\'appréciation graduels : DÉTESTER < ne pas aimer < aimer < apprécier < aimer beaucoup < ADORER.',
    example: 'J\'adore le jazz, j\'apprécie le rock.'
  },
  {
    weekNumber: 1,
    errorType: 'pronunciation',
    errorPattern: 'chiffres dates',
    strategy: 'Chiffres : découpage visuel → mille/centaine/dizaine. 1995 = mille neuf cent quatre-vingt-quinze.',
    example: '2024 = deux mille vingt-quatre.'
  },

  // ═══════════════════════════════════════════════════════════
  // SEMAINE 2 : PREMIÈRES INTERACTIONS
  // ═══════════════════════════════════════════════════════════
  {
    weekNumber: 2,
    errorType: 'grammar',
    errorPattern: 'négation',
    strategy: 'Négation encadre le verbe : NE + verbe + PAS/JAMAIS/RIEN/PERSONNE/PLUS/QUE. Au passé composé : NE + auxiliaire + PAS + participe.',
    example: 'Je ne fume PAS. Je n\'ai JAMAIS fumé.'
  },
  {
    weekNumber: 2,
    errorType: 'conjugation',
    errorPattern: 'passé récent',
    strategy: 'Passé récent = VENIR DE + infinitif (action juste terminée).',
    example: 'Je VIENS DE manger (il y a 2 minutes).'
  },
  {
    weekNumber: 2,
    errorType: 'conjugation',
    errorPattern: 'futur proche',
    strategy: 'Futur proche = ALLER + infinitif (action imminente ou programmée).',
    example: 'Je VAIS manger (dans 5 minutes), il VA finir ses études en juin.'
  },
  {
    weekNumber: 2,
    errorType: 'vocabulary',
    errorPattern: 'téléphone',
    strategy: 'Codes téléphone : "Qui est à l\'appareil ?" (qui appelle ?), "Ne quittez pas" (attendez), "C\'est de la part de qui ?" (votre nom ?).',
    example: 'Allô ? Qui est à l\'appareil ?'
  },
  {
    weekNumber: 2,
    errorType: 'pronunciation',
    errorPattern: 'expressions contact',
    strategy: 'Liaisons obligatoires : "Vous_appelez", "Vous_êtes". Prononciation "excusez" = [ɛkskyzé].',
    example: 'Nous_avons rendez-vous!'
  },

  // ═══════════════════════════════════════════════════════════
  // SEMAINE 3 : MON TRAVAIL ET MES HABITUDES
  // ═══════════════════════════════════════════════════════════
  {
    weekNumber: 3,
    errorType: 'conjugation',
    errorPattern: 'présent indicatif',
    strategy: 'Présent = terminaisons selon groupe. Groupe 1 (-ER) : e, es, e, ons, ez, ent. Verbes irréguliers : apprendre par cœur.',
    example: 'Partager : je partage, nous partageons.'
  },
  {
    weekNumber: 3,
    errorType: 'conjugation',
    errorPattern: 'verbes -DRE',
    strategy: 'Au présent: ENTENDRE, APPRENDRE, VENDRE. Prendre : je prendS, tu prendS, il prendØ.',
    example: 'Je comprends, il comprend.'
  },
  {
    weekNumber: 3,
    errorType: 'conjugation',
    errorPattern: 'verbes -OIR',
    strategy: 'Verbes en -OIR sont irréguliers. Mémoriser : POUVOIR, VOULOIR, DEVOIR, VOIR, SAVOIR.',
    example: 'Je peux, tu veux, il doit, je vois, ils savent.'
  },
  {
    weekNumber: 3,
    errorType: 'vocabulary',
    errorPattern: 'fréquence',
    strategy: 'Échelle de fréquence : TOUJOURS (100%) > souvent > parfois > rarement > JAMAIS (0%).',
    example: 'Je travaille toujours le lundi.'
  },
  {
    weekNumber: 3,
    errorType: 'pronunciation',
    errorPattern: 'monde professionnel',
    strategy: 'Nasales : entreprise [ɑ̃tʁəpʁiz], réunion [ʁeynjɔ̃]. Ne pas prononcer le N.',
    example: 'On dit : RéuniON [ʁeynjɔ̃], pas [ʁeynjon].'
  },

  // ═══════════════════════════════════════════════════════════
  // SEMAINE 4 : COMMUNIQUER ET RÉAGIR
  // ═══════════════════════════════════════════════════════════
  {
    weekNumber: 4,
    errorType: 'conjugation',
    errorPattern: 'subjonctif présent',
    strategy: 'Subjonctif après expressions de sentiment/opinion : que + subjonctif. Base : ILS au présent + terminaisons -e, -es, -e, -ions, -iez, -ent.',
    example: 'Je suis content QUE tu viennes (venir).'
  },
  {
    weekNumber: 4,
    errorType: 'grammar',
    errorPattern: 'subjonctif infinitif',
    strategy: 'RÈGLE : 1 sujet → DE + infinitif. 2 sujets différents → QUE + subjonctif.',
    example: 'Je suis heureux de vivre à Genève (1 sujet). Je suis heureux QUE TU VIVES à Genève (2 sujets).'
  },
  {
    weekNumber: 4,
    errorType: 'grammar',
    errorPattern: 'tutoiement vouvoiement',
    strategy: 'TU = informel (amis, famille). VOUS = formel (inconnus, supérieurs, respect).',
    example: 'Tu vas bien ? (ami). Vous allez bien ? (client).'
  },
  {
    weekNumber: 4,
    errorType: 'vocabulary',
    errorPattern: 'formules politesse',
    strategy: 'Email formel : "Madame/Monsieur" + "Cordialement/Respectueusement". Informel : "Salut" + "Bises/À+".',
    example: 'Chère Madame, ... Cordialement.'
  },
  {
    weekNumber: 4,
    errorType: 'vocabulary',
    errorPattern: 'abréviations SMS',
    strategy: 'SMS courants : MDR (mort de rire), STP (s\'il te plaît), BCP (beaucoup), RV (rendez-vous), TKT (t\'inquiète pas).',
    example: 'Tu viens au rdv ? Oui, tkt !'
  },
  {
    weekNumber: 4,
    errorType: 'pronunciation',
    errorPattern: 'expressions sentiments',
    strategy: 'Différenciation du masculin et féminin : heureux/heureuse, content/contente.',
    example: 'Je suis contentE de te voir (Je = une femme).'
  },

  // ═══════════════════════════════════════════════════════════
  // SEMAINE 5 : EXPRIMER SES SOUHAITS ET SES CRAINTES
  // ═══════════════════════════════════════════════════════════
  {
    weekNumber: 5,
    errorType: 'grammar',
    errorPattern: 'subjonctif infinitif',
    strategy: 'RÈGLE : 1 sujet → DE + infinitif. 2 sujets différents → QUE + subjonctif.',
    example: 'Je veux VENIR avec toi (1 sujet). Je veux QUE tu VIENNES avec moi (2 sujets).'
  },
  {
    weekNumber: 5,
    errorType: 'grammar',
    errorPattern: 'exception indicatif',
    strategy: 'EXCEPTION : espérer QUE + indicatif.',
    example: 'Il espère que tu vas bien. Nous espérons que tu as passé de bonnes vacances.'
  },
  {
    weekNumber: 5,
    errorType: 'conjugation',
    errorPattern: 'subjonctif irrégulier',
    strategy: 'Subjonctifs irréguliers à mémoriser : ÊTRE (sois), AVOIR (aie), ALLER (aille), FAIRE (fasse), POUVOIR (puisse), SAVOIR (sache).',
    example: 'Je veux qu\'il SOIT là (être).'
  },
  {
    weekNumber: 5,
    errorType: 'vocabulary',
    errorPattern: 'verbes sentiment',
    strategy: 'Verbes de souhait (+ subj.) : souhaiter, désirer, vouloir, rêver QUE. Verbes de crainte : avoir peur, craindre QUE.',
    example: 'Je souhaite QUE tu réussisses.'
  },
  {
    weekNumber: 5,
    errorType: 'pronunciation',
    errorPattern: 'expressions peur doute',
    strategy: 'Nasale dans "craindre" [kʁɛ̃dʁ], "peur" [pœʁ].',
    example: 'J\'ai peur [pœʁ], je crains [kʁɛ̃].'
  },

  // ═══════════════════════════════════════════════════════════
  // SEMAINE 6 : DEMANDER ET OFFRIR DE L'AIDE
  // ═══════════════════════════════════════════════════════════
  {
    weekNumber: 6,
    errorType: 'conjugation',
    errorPattern: 'conditionnel politesse',
    strategy: 'Conditionnel de politesse = infinitif + terminaisons -ais, -ais, -ait, -ions, -iez, -aient. Verbes irréguliers : à mémoriser.',
    example: 'Je voudrais (vouloir), tu pourrais (pouvoir), J\'aimerais (aimer).'
  },
  {
    weekNumber: 6,
    errorType: 'grammar',
    errorPattern: 'pronom en',
    strategy: 'Pronom EN remplace DE + nom (quantité, origine). Placé AVANT le verbe.',
    example: 'Tu as des outils ? Oui, j\'EN ai.'
  },
  {
    weekNumber: 6,
    errorType: 'vocabulary',
    errorPattern: 'demander aide',
    strategy: 'Degrés de politesse : "Peux-tu..." (informel) < "Pourrais-tu..." < "Pourriez-vous..." (formel).',
    example: 'Pourriez-vous m\'aider ?'
  },
  {
    weekNumber: 6,
    errorType: 'pronunciation',
    errorPattern: 'conditionnel',
    strategy: 'Conditionnel = son [ʁɛ] à la fin. On dit : "Je voudrais" [vudʁɛ], pas [vudʁa].',
    example: 'Je voudrais [vudʁɛ], tu pourrais [puʁɛ].'
  },

  // ═══════════════════════════════════════════════════════════
  // SEMAINE 7 : DROITS ET PROJETS
  // ═══════════════════════════════════════════════════════════
  {
    weekNumber: 7,
    errorType: 'grammar',
    errorPattern: 'négation complexe',
    strategy: 'Négation NI...NI = NE + verbe + NI + nom1 + NI + nom2. AUCUN(E)...NE = AUCUN(E) + nom + NE + verbe.',
    example: 'Je n\'aime NI le café NI le thé. AUCUN enfant NE manque.'
  },
  {
    weekNumber: 7,
    errorType: 'grammar',
    errorPattern: 'prépositions verbes',
    strategy: 'Verbes + préposition fixe : bénéficier DE, aider À, encourager À, priver DE. À mémoriser.',
    example: 'Il bénéficie DE droits. J\'aide À organiser.'
  },
  {
    weekNumber: 7,
    errorType: 'vocabulary',
    errorPattern: 'préfixes antonymes',
    strategy: 'Préfixes négatifs : IN- (inefficace), DÉ- (déstabilisé), MAL- (malhonnête), IM- devant P/B/M (impossible).',
    example: 'Efficace → INefficace. Honnête → MALhonnête.'
  },
  {
    weekNumber: 7,
    errorType: 'vocabulary',
    errorPattern: 'description projet',
    strategy: 'Structure projet : 1) Objectif/But, 2) Public visé, 3) Actions, 4) Lieu/Durée.',
    example: 'Objectif : protéger. Public : enfants. Action : sensibiliser.'
  },
  {
    weekNumber: 7,
    errorType: 'pronunciation',
    errorPattern: 'droits enfance',
    strategy: 'Nasale: droits [dʁwa], "enfant" [ɑ̃fɑ̃].',
    example: 'Les droits [dʁwa] et [e] devoirs pour les enfants [ɑ̃fɑ̃].'
  },

  // ═══════════════════════════════════════════════════════════
  // SEMAINE 8 : ENGAGEMENT CITOYEN ET ENVIRONNEMENT
  // ═══════════════════════════════════════════════════════════
  {
    weekNumber: 8,
    errorType: 'grammar',
    errorPattern: 'expression but',
    strategy: 'But = POUR/AFIN DE + infinitif (même sujet). POUR QUE/AFIN QUE + subjonctif (sujets différents).',
    example: 'Je recycle POUR protéger la planète. Je recycle POUR QUE la planète soit propre.'
  },
  {
    weekNumber: 8,
    errorType: 'grammar',
    errorPattern: 'quantité proportion',
    strategy: 'Fractions : la moitié (1/2), un tiers (1/3), un quart (1/4). Pourcentage : 25% DE.',
    example: 'La moitié DES déchets. 25% DE la population.'
  },
  {
    weekNumber: 8,
    errorType: 'grammar',
    errorPattern: 'comparaison données',
    strategy: 'Comparer quantités : PLUS DE/MOINS DE + nom + QUE. DEUX FOIS PLUS DE + nom + QUE.',
    example: 'Plus DE déchets QUE l\'an dernier.'
  },
  {
    weekNumber: 8,
    errorType: 'vocabulary',
    errorPattern: 'environnement',
    strategy: 'Circuit déchets : produire → trier → recycler/composter/incinérer → traiter. Ou : jeter → décharge.',
    example: 'Je trie, puis je recycle.'
  },
  {
    weekNumber: 8,
    errorType: 'pronunciation',
    errorPattern: 'engagement écologie',
    strategy: 'Nasales : environnement [ɑ̃viʁɔnmɑ̃], engagement [ɑ̃ɡaʒmɑ̃], bénévole [benévɔl].',
    example: 'L\'environnement [ɑ̃viʁɔnmɑ̃].'
  },

  // ═══════════════════════════════════════════════════════════
  // SEMAINE 9 : INITIATIVES ÉCOLOGIQUES
  // ═══════════════════════════════════════════════════════════
  {
    weekNumber: 9,
    errorType: 'vocabulary',
    errorPattern: 'traitement déchets',
    strategy: 'Actions déchets : TRIER (séparer), JETER (poubelle), COMPOSTER (bio), INCINÉRER (brûler), RECYCLER (transformer).',
    example: 'Je trie, je composte, je recycle.'
  },
  {
    weekNumber: 9,
    errorType: 'vocabulary',
    errorPattern: 'évolution',
    strategy: 'Évolution positive : progresser, améliorer, augmenter ↗. Évolution négative : réduire, diminuer, baisser ↘.',
    example: 'Les déchets diminuent. Le recyclage progresse.'
  },
  {
    weekNumber: 9,
    errorType: 'grammar',
    errorPattern: 'consolidation quantité',
    strategy: 'Révision : la majorité DE, un tiers DE, 50% DE. Comparaison : plus DE...QUE.',
    example: 'La majorité DES gens trient.'
  },
  {
    weekNumber: 9,
    errorType: 'pronunciation',
    errorPattern: 'verbes évolution',
    strategy: 'Sons [ɛ] vs [e] : augmenter [ogmɑ̃té], réduire [ʁedɥiʁ], améliorer [ameljɔʁé].',
    example: 'Augmenter [é], réduire [ui].'
  },

  // ═══════════════════════════════════════════════════════════
  // SEMAINE 10 : DONNER SON OPINION SUR DES PROJETS
  // ═══════════════════════════════════════════════════════════
  {
    weekNumber: 10,
    errorType: 'grammar',
    errorPattern: 'pronoms possessifs',
    strategy: 'Pronoms possessifs = LE/LA/LES + MIEN/TIEN/SIEN/NÔTRE/VÔTRE/LEUR remplacent "mon/ton/son + nom".',
    example: 'Mon projet → LE MIEN. Tes idées → LES TIENNES.'
  },
  {
    weekNumber: 10,
    errorType: 'grammar',
    errorPattern: 'cause conséquence',
    strategy: 'Cause : PARCE QUE, GRÂCE À. Conséquence : DONC, C\'EST POURQUOI, PAR CONSÉQUENT.',
    example: 'Il pleut DONC je reste. Je reste chez moi PARCE QU\'il pleut.'
  },
  {
    weekNumber: 10,
    errorType: 'vocabulary',
    errorPattern: 'nominalisation',
    strategy: 'Verbe → Nom : décider → décision, construire → construction, protéger → protection. Noms féminins -TION, -TÉ, Noms masculins -MENT, -AGE.',
    example: 'Décider → la décision. Recycler → le recyclage.'
  },
  {
    weekNumber: 10,
    errorType: 'vocabulary',
    errorPattern: 'opinion',
    strategy: 'Exprimer opinion : JE PENSE QUE, À MON AVIS, SELON MOI, JE SUIS D\'ACCORD AVEC, JE CROIS QUE.',
    example: 'À mon avis, c\'est important.'
  },
  {
    weekNumber: 10,
    errorType: 'pronunciation',
    errorPattern: 'pronoms possessifs',
    strategy: 'Distinction [jɛ̃] vs [tjɛ̃] : le mien [mjɛ̃], le tien [tjɛ̃], le sien [sjɛ̃].',
    example: 'Le mien [mjɛ̃], le tien [tjɛ̃].'
  },

  // ═══════════════════════════════════════════════════════════
  // SEMAINE 11 : BILAN ET RÉVISIONS
  // ═══════════════════════════════════════════════════════════
  {
    weekNumber: 11,
    errorType: 'grammar',
    errorPattern: 'révision générale',
    strategy: 'Révision : Négation complexe, expression du but (pour/pour que), quantités (la moitié de), pronoms possessifs, cause/conséquence.',
    example: 'Mobiliser toutes les compétences acquises.'
  },
  {
    weekNumber: 11,
    errorType: 'conjugation',
    errorPattern: 'révision temps',
    strategy: 'Révision temps : présent (habitudes), passé composé (actions), imparfait (description), futur proche (intention), subjonctif (sentiment).',
    example: 'Je mange (présent). J\'ai mangé (PC). Je mangeais (imp).'
  },
  {
    weekNumber: 11,
    errorType: 'vocabulary',
    errorPattern: 'révision thématique',
    strategy: 'Révision vocabulaire semaines 7-10 : droits, projets, environnement, engagement, opinion.',
    example: 'Réactiver le vocabulaire thématique.'
  },
  {
    weekNumber: 11,
    errorType: 'pronunciation',
    errorPattern: 'révision phonétique',
    strategy: 'Révision sons : nasales ([ɑ̃], [ɔ̃], [ɛ̃]), liaisons (obligatoires, interdites, facultatives), distinction [e]/[ɛ].',
    example: 'Travailler les sons problématiques identifiés.'
  }
];

/**
 * Récupère les stratégies pour une semaine donnée
 */
export function getStrategiesForWeek(weekNumber: number): LearningStrategies[] {
  return LEARNING_STRATEGIES.filter(s => s.weekNumber === weekNumber);
}

/**
 * Récupère une stratégie spécifique par type d'erreur et pattern
 */
export function getStrategyByError(
  weekNumber: number, 
  errorType: 'grammar' | 'vocabulary' | 'conjugation' | 'pronunciation',
  keyword: string
): LearningStrategies | undefined {
  const weekStrategies = getStrategiesForWeek(weekNumber);
  return weekStrategies.find(s => 
    s.errorType === errorType && 
    s.errorPattern.toLowerCase().includes(keyword.toLowerCase())
  );
}

/**
 * Récupère toutes les stratégies d'un type donné pour une semaine
 */
export function getStrategiesByType(
  weekNumber: number,
  errorType: 'grammar' | 'vocabulary' | 'conjugation' | 'pronunciation'
): LearningStrategies[] {
  return getStrategiesForWeek(weekNumber).filter(s => s.errorType === errorType);
}