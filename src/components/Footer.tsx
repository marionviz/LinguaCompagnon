// src/components/Footer.tsx
import React from 'react';

interface FooterProps {
  onCGUClick: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onCGUClick }) => {
  return (
    <footer className="bg-white border-t border-gray-200 py-3 px-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
        {/* Left side */}
        <div className="flex items-center gap-2">
          <span>© 2026 LinguaCompagnon</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Marion Vizier-Marzais</span>
        </div>

        {/* Right side - Links */}
        <div className="flex items-center gap-3">
          <button
            onClick={onCGUClick}
            className="text-brand-green hover:underline hover:text-green-700 transition-colors"
          >
            Conditions d'utilisation
          </button>
          <span>•</span>
          <a
            href="mailto:marionviz@hotmail.com"
            className="text-brand-green hover:underline hover:text-green-700 transition-colors"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
};
