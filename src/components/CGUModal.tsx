// src/components/CGUModal.tsx
import React from 'react';

interface CGUModalProps {
  onClose: () => void;
}

export const CGUModal: React.FC<CGUModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-brand-green">Conditions Générales d'Utilisation</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fermer"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-center text-sm text-gray-600 italic mb-6">Dernière mise à jour : Janvier 2026</p>

          {/* Section 1 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-green mb-3">1. Présentation du service</h3>
            <p className="text-gray-700 mb-3">
              LinguaCompagnon est un assistant conversationnel intelligent conçu pour accompagner l'apprentissage du français langue étrangère. 
              Développé dans le cadre d'un mémoire de Master 2 en Ingénierie Pédagogique Multimodale par Marion Vizier-Marzais, 
              cet outil pédagogique vise à favoriser l'<strong>apprenance</strong> (apprendre à apprendre) en offrant un environnement d'entraînement personnalisé.
            </p>
            
            <h4 className="font-semibold text-gray-800 mb-2">Fonctionnalités principales</h4>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mb-3">
              <li><strong>Mode Écrit</strong> : activités progressives avec corrections instantanées</li>
              <li><strong>Mode Oral</strong> : conversations en temps réel avec synthèse vocale</li>
              <li><strong>Boîte à Outils personnelle</strong> : conservation et organisation de vos corrections</li>
            </ul>

            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
              <p className="font-bold text-amber-800 mb-1">⚠️ Important</p>
              <p className="text-sm text-amber-700">
                LinguaCompagnon est un outil d'entraînement et de pratique, pas un substitut à l'enseignement humain. 
                L'intelligence artificielle peut faire des erreurs : validez toujours les informations importantes avec un enseignant qualifié.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-green mb-3">2. Infrastructure technique</h3>
            
            <h4 className="font-semibold text-gray-800 mb-2">Hébergement et déploiement</h4>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mb-3">
              <li><strong>Code source :</strong> Hébergé sur GitHub</li>
              <li><strong>Déploiement :</strong> Application déployée sur Vercel</li>
            </ul>

            <h4 className="font-semibold text-gray-800 mb-2">Technologies utilisées</h4>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li><strong>IA :</strong> Google Cloud AI (Gemini 2.0 Flash Exp, Text-to-Speech Chirp 3 HD)</li>
              <li><strong>Reconnaissance vocale :</strong> Web Speech API (navigateur, fonctionne en local)</li>
              <li><strong>Stockage :</strong> localStorage du navigateur (uniquement sur votre appareil)</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-green mb-3">3. Collecte et traitement des données</h3>
            
            <h4 className="font-semibold text-gray-800 mb-2">3.1 Données stockées localement</h4>
            <p className="text-gray-700 mb-2">
              <strong>Vos corrections et notes personnelles</strong> (Boîte à Outils) sont stockées dans le <strong>localStorage de votre navigateur</strong>. Ces données :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mb-3">
              <li>Restent sur votre appareil uniquement</li>
              <li>Ne sont jamais transmises à des serveurs externes</li>
              <li>Ne sont accessibles à personne d'autre que vous</li>
              <li>Peuvent être supprimées en vidant le cache du navigateur</li>
            </ul>

            <h4 className="font-semibold text-gray-800 mb-2">3.2 Données traitées par Google Cloud AI</h4>
            <p className="text-gray-700 mb-2">
              <strong>Vos conversations avec François</strong> sont traitées en temps réel par Google Cloud AI pour :
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mb-3">
              <li>Générer des réponses contextuelles</li>
              <li>Synthétiser la voix en français</li>
            </ul>

            <div className="bg-green-50 border-l-4 border-brand-green p-4 rounded mb-3">
              <p className="font-bold text-brand-green mb-1">🔒 Engagement contractuel de Google</p>
              <p className="text-sm text-gray-700">
                Selon les conditions d'utilisation de l'API Gemini et Google Cloud Text-to-Speech, Google s'engage à 
                <strong> ne pas utiliser vos données pour entraîner ses modèles d'IA</strong> sans votre consentement explicite.
              </p>
            </div>

            <h4 className="font-semibold text-gray-800 mb-2">3.3 Conservation temporaire</h4>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mb-3">
              <li><strong>Traitement immédiat :</strong> Données supprimées après génération de la réponse</li>
              <li><strong>Logs de sécurité :</strong> Conservation max 30 jours (détection abus/spam), puis suppression automatique</li>
            </ul>

            <h4 className="font-semibold text-gray-800 mb-2">3.4 Accès aux données</h4>
            <p className="text-gray-700">
              <strong>Marion Vizier-Marzais</strong> (responsable du projet) <strong>n'a aucun accès</strong> à vos conversations.
            </p>
          </section>

          {/* Section 4 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-green mb-3">4. Sécurité et confidentialité</h3>
            
            <h4 className="font-semibold text-gray-800 mb-2">Mesures de sécurité</h4>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mb-3">
              <li>Connexion sécurisée HTTPS</li>
              <li>API officielles Google Cloud (certifiées ISO 27001)</li>
              <li>Clés API protégées et non exposées</li>
              <li>Aucune base de données côté serveur</li>
            </ul>

            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
              <p className="font-bold text-amber-800 mb-1">⚠️ Ne partagez JAMAIS d'informations sensibles</p>
              <p className="text-sm text-amber-700 mb-2">Évitez de communiquer :</p>
              <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                <li>Mots de passe, codes PIN, informations bancaires</li>
                <li>Données médicales ou de santé</li>
                <li>Informations professionnelles confidentielles</li>
              </ul>
            </div>
          </section>

          {/* Section 5 - RGPD */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-green mb-3">5. Droits des utilisateurs (RGPD)</h3>
            <p className="text-gray-700 mb-3">Vous disposez des droits suivants :</p>

            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Droit d'accès</h4>
                <p className="text-sm text-gray-700">
                  Contactez <a href="mailto:marionviz@hotmail.com" className="text-brand-green hover:underline">marionviz@hotmail.com</a>
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Droit de rectification</h4>
                <p className="text-sm text-gray-700">Modifiez vos corrections directement dans l'interface</p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Droit à l'effacement</h4>
                <p className="text-sm text-gray-700">
                  <strong>Données locales :</strong> Videz le cache de votre navigateur<br />
                  <strong>Données Google :</strong> Suppression automatique (max 30 jours)
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Droit d'opposition</h4>
                <p className="text-sm text-gray-700">Cessez d'utiliser LinguaCompagnon à tout moment</p>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-green mb-3">6. Contact</h3>
            <ul className="text-gray-700 space-y-1">
              <li><strong>Responsable :</strong> Marion Vizier-Marzais</li>
              <li><strong>Email :</strong> <a href="mailto:marionviz@hotmail.com" className="text-brand-green hover:underline">marionviz@hotmail.com</a></li>
              <li><strong>Délai de réponse :</strong> 48 heures maximum</li>
            </ul>
          </section>

          {/* Sources */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-green mb-3">7. Sources officielles</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>
                <strong>Gemini API :</strong>{' '}
                <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline">
                  ai.google.dev/gemini-api/terms
                </a>
              </li>
              <li>
                <strong>Google Cloud TTS :</strong>{' '}
                <a href="https://cloud.google.com/text-to-speech/docs/data-logging" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline">
                  cloud.google.com/text-to-speech/docs/data-logging
                </a>
              </li>
              <li>
                <strong>GitHub :</strong>{' '}
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline">
                  github.com
                </a>
              </li>
              <li>
                <strong>Vercel :</strong>{' '}
                <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline">
                  vercel.com
                </a>
              </li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <p className="text-center text-sm text-gray-600 italic mb-3">
            En utilisant LinguaCompagnon, vous acceptez les présentes Conditions Générales d'Utilisation.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-brand-green text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
};
