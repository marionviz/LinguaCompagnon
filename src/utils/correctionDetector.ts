import { Correction } from '../types';

/**
 * Détecte les corrections dans la réponse de l'IA
 * Patterns courants :
 * - "Attention ! ..."
 * - "Il faut dire ... et non ..."
 * - "La bonne forme est ..."
 * - "**Correction** :"
 */
export function detectCorrections(aiResponse: string): Correction[] {
  const corrections: Correction[] = [];

  // Pattern 1 : "Attention ! [erreur] → [correction]"
  const attentionPattern = /Attention\s*!.*?(?:il faut|on dit|on écrit|la forme correcte est)\s+["']?([^"'.!]+)["']?/gi;
  let match;
  
  while ((match = attentionPattern.exec(aiResponse)) !== null) {
    corrections.push({
      error: extractError(aiResponse, match.index),
      correction: match[1].trim(),
      explanation: extractExplanation(aiResponse, match.index),
      category: categorizeCorrection(aiResponse),
      example: match[0],
    });
  }

  // Pattern 2 : "**Correction** : ..."
  const correctionPattern = /\*\*Correction\*\*\s*:\s*([^.!]+)/gi;
  
  while ((match = correctionPattern.exec(aiResponse)) !== null) {
    corrections.push({
      error: 'Erreur détectée',
      correction: match[1].trim(),
      explanation: extractExplanation(aiResponse, match.index),
      category: categorizeCorrection(aiResponse),
    });
  }

  // Pattern 3 : Détection de verbes mal conjugués
  const conjugationPattern = /(?:vous avez écrit|tu as dit)\s+["']([^"']+)["'].*?(?:il faut|on dit)\s+["']([^"']+)["']/gi;
  
  while ((match = conjugationPattern.exec(aiResponse)) !== null) {
    corrections.push({
      error: match[1].trim(),
      correction: match[2].trim(),
      explanation: extractExplanation(aiResponse, match.index),
      category: 'conjugation',
      example: match[0],
    });
  }

  return corrections;
}

function extractError(text: string, position: number): string {
  // Chercher en arrière pour trouver l'erreur mentionnée
  const before = text.substring(Math.max(0, position - 100), position);
  const errorMatch = before.match(/["']([^"']+)["']/);
  return errorMatch ? errorMatch[1] : 'Erreur';
}

function extractExplanation(text: string, position: number): string {
  // Chercher après la correction pour l'explication
  const after = text.substring(position, position + 200);
  const sentences = after.split(/[.!?]/);
  return sentences[0]?.trim() || 'Correction détectée par l\'IA';
}

function categorizeCorrection(text: string): Correction['category'] {
  const lower = text.toLowerCase();
  
  if (lower.includes('conjugaison') || lower.includes('temps') || lower.includes('auxiliaire')) {
    return 'conjugation';
  }
  if (lower.includes('vocabulaire') || lower.includes('mot') || lower.includes('expression')) {
    return 'vocabulary';
  }
  if (lower.includes('accord') || lower.includes('grammaire') || lower.includes('genre')) {
    return 'grammar';
  }
  if (lower.includes('prononciation') || lower.includes('accent')) {
    return 'pronunciation';
  }
  
  return 'grammar'; // Par défaut
}