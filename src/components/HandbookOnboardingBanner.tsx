import React, { useEffect, useState } from 'react';

const BANNER_KEY = 'handbook_onboarding_banner_dismissed';

export default function HandbookOnboardingBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Visa bannern bara om den inte är stängd tidigare
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem(BANNER_KEY);
      setVisible(!dismissed);
    }
  }, []);

  const handleClose = () => {
    setVisible(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(BANNER_KEY, '1');
    }
  };

  if (!visible) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-md shadow mb-6 flex items-center justify-between animate-fade-in">
      <div>
        <div className="font-semibold text-lg mb-1">🎉 Välkommen till din digitala handbok!</div>
        <div className="text-sm">
          Din handbok är nu klar och du kan börja redigera innehållet direkt.<br />
          <ul className="list-disc ml-5 mt-1">
            <li>Klicka på <b>Redigera</b> för att anpassa sektioner och sidor.</li>
            <li>Bjud in styrelsemedlemmar eller boende under <b>Användare</b>.</li>
            <li>Behöver du hjälp? <a href="/documentation" className="underline text-blue-700">Läs vår dokumentation</a> eller <a href="/contact" className="underline text-blue-700">kontakta supporten</a>.</li>
          </ul>
        </div>
      </div>
      <button onClick={handleClose} className="ml-4 text-blue-700 hover:text-blue-900 font-bold text-xl" aria-label="Stäng">&times;</button>
    </div>
  );
} 