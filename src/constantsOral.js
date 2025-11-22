// Configuration pour le mode oral (LiveTutor)
// Basé sur votre programme LinguaCompagnon

import { CourseWeekOral } from './typesOral';
import { getWeekThemes } from './services/geminiService';

export const GEMINI_MODEL_LIVE = 'gemini-2.5-flash-native-audio-preview-09-2025';

// Mapper les semaines LinguaCompagnon vers le format LiveTutor
export function getOralWeekConfig(weekNumber: number): CourseWeekOral {
  // Récupérer les thèmes depuis votre geminiService
  const themes = getWeekThemes(weekNumber);
  
  const weeksConfig: Record<number, Omit<CourseWeekOral, 'id'>> = {
    1: {
      title: "Semaine 1 : Se présenter",
      description: themes,
      topics: ["Se présenter", "Présenter quelqu'un", "Salutations"],
      vocabulary: ["C'est", "Il/Elle est", "Bonjour/Bonsoir"],
      grammar: ["'C'est' vs 'Il/Elle est'", "Articles définis/indéfinis"],
      objective: "Initiez une conversation où l'apprenant se présente (nom, nationalité, profession). Pratiquez 'c'est' et 'il/elle est'."
    },
    2: {
      title: "Semaine 2 : Conversations téléphoniques",
      description: themes,
      topics: ["Téléphone", "Rencontres", "Négation"],
      vocabulary: ["Ça fait longtemps !", "Ne quittez pas", "C'est de la part de qui ?"],
      grammar: ["Négation (ne...pas, ne...jamais)", "Passé récent & Futur proche"],
      objective: "Proposez un jeu de rôle : appel téléphonique, erreur de numéro, rencontre avec un ami. Encouragez l'utilisation de la négation."
    },
    3: {
      title: "Semaine 3 : Mon travail",
      description: themes,
      topics: ["Profession", "Entreprise", "Habitudes"],
      vocabulary: ["Entreprise/Carrière", "Réunion", "Toujours/Souvent/Jamais"],
      grammar: ["Présent de l'indicatif", "Verbes en -DRE, -TRE, -OIR"],
      objective: "Conversation sur la profession et les tâches quotidiennes. Discutez du télétravail."
    },
    4: {
      title: "Semaine 4 : Communiquer & Réagir",
      description: themes,
      topics: ["Communication formelle/informelle", "Émotions"],
      vocabulary: ["Cordialement/Bises", "C'est génial que...", "Dommage que..."],
      grammar: ["Subjonctif présent", "Tu vs Vous"],
      objective: "Jeu de rôle : annonce une nouvelle (promotion) et réagis. Utilise des structures avec subjonctif."
    },
    5: {
      title: "Semaine 5 : Souhaits & Craintes",
      description: themes,
      topics: ["Aspirations", "Rêves", "Peurs"],
      vocabulary: ["Souhaiter/Désirer", "Craindre", "J'aimerais que..."],
      grammar: ["Subjonctif vs Infinitif"],
      objective: "Discutez des aspirations et craintes. Corrigez l'alternance subjonctif/infinitif."
    },
    6: {
      title: "Semaine 6 : Demander de l'aide",
      description: themes,
      topics: ["Voisinage", "Services", "Politesse"],
      vocabulary: ["Pourriez-vous...", "Ça vous dérangerait de...", "Volontiers"],
      grammar: ["Conditionnel de politesse", "Pronom 'en'"],
      objective: "Mise en situation : demander de l'aide à un voisin. Pratique du conditionnel et du pronom 'en'."
    },
    7: {
      title: "Semaine 7 : Droits & Projets",
      description: themes,
      topics: ["Droits de l'enfant", "Projets éducatifs"],
      vocabulary: ["Protection/Égalité", "Objectif/Public visé"],
      grammar: ["Négation complexe (ni...ni, aucun)", "Prépositions verbales"],
      objective: "Débat sur les droits de l'enfant. Décrire un projet éducatif."
    },
    8: {
      title: "Semaine 8 : Engagement & Environnement",
      description: themes,
      topics: ["Citoyenneté", "Écologie", "Biodiversité"],
      vocabulary: ["Bénévole/Association", "Recyclage", "Lutter contre"],
      grammar: ["Expression du but (pour que, afin de)", "Quantité"],
      objective: "Débat sur une initiative locale (recyclage). Expliquer le but et utiliser des expressions de quantité."
    },
    9: {
      title: "Semaine 9 : Initiatives Écologiques",
      description: themes,
      topics: ["Campagne de promotion", "Réduction des déchets"],
      vocabulary: ["Trier/Composter/Jeter", "Progresser/Améliorer"],
      grammar: ["But/Quantité/Comparaison"],
      objective: "Créer un slogan ou promouvoir une campagne. Utiliser le vocabulaire de l'évolution."
    },
    10: {
      title: "Semaine 10 : Opinions sur des Projets",
      description: themes,
      topics: ["Comparaison", "Argumentation", "Opinion"],
      vocabulary: ["Nominalisation", "À mon avis", "Je suis d'accord"],
      grammar: ["Pronoms possessifs", "Cause et Conséquence"],
      objective: "Comparer deux projets. Donner son avis avec pronoms possessifs et connecteurs logiques."
    },
    11: {
      title: "Semaine 11 : Bilan & Révisions",
      description: themes,
      topics: ["Révision générale", "Module 2"],
      vocabulary: ["Révision vocabulaire Semaines 7-10"],
      grammar: ["Négation complexe", "But", "Quantités", "Pronoms possessifs"],
      objective: "Conversation ouverte mobilisant les acquis du module 2. Préparation tâche finale."
    }
  };

  const config = weeksConfig[weekNumber] || weeksConfig[1];
  
  return {
    id: weekNumber,
    ...config
  };
}