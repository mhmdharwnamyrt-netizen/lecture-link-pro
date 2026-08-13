import React from 'react';

interface ChatBackgroundProps {
  departmentId?: string;
  departmentName?: string;
}

const ChatBackground: React.FC<ChatBackgroundProps> = ({ departmentId, departmentName }) => {
  const name = (departmentName || '').toLowerCase();
  
  // Define themes based on department
  let theme = {
    color: 'bg-slate-50 dark:bg-[#0A0F1D]',
    pattern: 'opacity-[0.03] dark:opacity-[0.05]',
    svg: (
      <pattern id="chat-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
        <path d="M0 0h100v100H0z" fill="none" />
        <circle cx="50" cy="50" r="1" fill="currentColor" />
      </pattern>
    )
  };

  if (name.includes('information') || name.includes('it') || name.includes('تكنولوجيا المعلومات')) {
    theme = {
      color: 'bg-blue-50/50 dark:bg-[#0B1224]',
      pattern: 'opacity-[0.04] dark:opacity-[0.07]',
      svg: (
        <pattern id="chat-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M10 10h10v10H10z M30 30h5v5h-5z M50 10h2v2h-2z M10 50h3v3h-3z" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <path d="M15 20v10 M32.5 35v15 M51 12v38 M20 15h10" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
        </pattern>
      )
    };
  } else if (name.includes('mechatronics') || name.includes('ميكاترونكس')) {
    theme = {
      color: 'bg-slate-50 dark:bg-[#0E1525]',
      pattern: 'opacity-[0.04] dark:opacity-[0.06]',
      svg: (
        <pattern id="chat-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <circle cx="40" cy="40" r="15" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="40" cy="40" r="5" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <path d="M40 20v5 M40 55v5 M20 40h5 M55 40h5" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </pattern>
      )
    };
  } else if (name.includes('autotronics') || name.includes('أوتوترونكس')) {
    theme = {
      color: 'bg-stone-50 dark:bg-[#0D1117]',
      pattern: 'opacity-[0.03] dark:opacity-[0.05]',
      svg: (
        <pattern id="chat-pattern" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M0 25 L50 25 M25 0 L25 50" fill="none" stroke="currentColor" strokeWidth="0.2" />
          <path d="M10 10 L40 40 M40 10 L10 40" fill="none" stroke="currentColor" strokeWidth="0.1" />
        </pattern>
      )
    };
  } else if (name.includes('renewable') || name.includes('طاقة متجددة')) {
    theme = {
      color: 'bg-teal-50/30 dark:bg-[#0C161C]',
      pattern: 'opacity-[0.05] dark:opacity-[0.08]',
      svg: (
        <pattern id="chat-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M50 20 L60 40 L80 40 L65 55 L75 75 L50 65 L25 75 L35 55 L20 40 L40 40 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </pattern>
      )
    };
  }

  return (
    <div className={`fixed inset-0 z-[-1] transition-colors duration-500 ${theme.color}`}>
      <svg className={`h-full w-full text-primary ${theme.pattern}`} xmlns="http://www.w3.org/2000/svg">
        <defs>{theme.svg}</defs>
        <rect width="100%" height="100%" fill="url(#chat-pattern)" />
      </svg>
      {/* Soft overlay for better contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/20 pointer-events-none" />
    </div>
  );
};

export default ChatBackground;
