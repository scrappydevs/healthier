"use client";

import { useState, useEffect } from 'react';

const statements = [
  "Never miss a dose again.",
  "Monitor your nutrition.",
  "Track your exercise.",
  "Stay on schedule.",
  "Take control of your health.",
];

export function TypewriterText() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentStatement = statements[currentIndex];
    
    if (!isDeleting && displayText.length < currentStatement.length) {
      // Typing - faster speed
      const timeout = setTimeout(() => {
        setDisplayText(currentStatement.slice(0, displayText.length + 1));
      }, 50);
      return () => clearTimeout(timeout);
    } else if (!isDeleting && displayText.length === currentStatement.length) {
      // Pause after typing complete
      const timeout = setTimeout(() => {
        setIsDeleting(true);
      }, 2000);
      return () => clearTimeout(timeout);
    } else if (isDeleting) {
      // Fast collapse - delete instantly
      setDisplayText('');
      setIsDeleting(false);
      setCurrentIndex((prev) => (prev + 1) % statements.length);
    }
  }, [displayText, isDeleting, currentIndex]);

  return (
    <span className="inline-block break-words">
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  );
}
