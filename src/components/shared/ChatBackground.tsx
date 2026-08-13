import React from 'react';

interface ChatBackgroundProps {
  departmentId?: string;
  departmentName?: string;
}

const ChatBackground: React.FC<ChatBackgroundProps> = ({ departmentId, departmentName }) => {
  const name = (departmentName || '').toLowerCase();
  
  // Define themes based on department with much more visible patterns
  let theme = {
    color: 'bg-slate-100/80 dark:bg-[#0A0F1D]',
    pattern: 'opacity-[0.1] dark:opacity-[0.15]',
    svg: (
      <pattern id="chat-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
        <circle cx="40" cy="40" r="1.5" fill="currentColor" />
        <path d="M20 20 L60 60 M60 20 L20 60" stroke="currentColor" strokeWidth="0.2" fill="none" />
      </pattern>
    )
  };

  if (name.includes('information') || name.includes('it') || name.includes('تكنولوجيا المعلومات')) {
    theme = {
      color: 'bg-blue-100/40 dark:bg-[#0B1224]',
      pattern: 'opacity-[0.15] dark:opacity-[0.2]',
      svg: (
        <pattern id="chat-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
          {/* Circuit board style */}
          <path d="M10 10h30v30h-30z" fill="none" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="10" cy="10" r="2" fill="currentColor" />
          <circle cx="40" cy="10" r="2" fill="currentColor" />
          <circle cx="40" cy="40" r="2" fill="currentColor" />
          <circle cx="10" cy="40" r="2" fill="currentColor" />
          <path d="M40 25h20v20h20" fill="none" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="80" cy="45" r="2" fill="currentColor" />
          <path d="M25 40v30h-15" fill="none" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="10" cy="70" r="2" fill="currentColor" />
        </pattern>
      )
    };
  } else if (name.includes('mechatronics') || name.includes('ميكاترونكس')) {
    theme = {
      color: 'bg-slate-100/60 dark:bg-[#0E1525]',
      pattern: 'opacity-[0.12] dark:opacity-[0.18]',
      svg: (
        <pattern id="chat-pattern" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
          <circle cx="60" cy="60" r="25" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="60" cy="60" r="8" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M60 30 L60 40 M60 80 L60 90 M30 60 L40 60 M80 60 L90 60" stroke="currentColor" strokeWidth="1" />
          <path d="M38 38 L45 45 M75 75 L82 82 M82 38 L75 45 M45 75 L38 82" stroke="currentColor" strokeWidth="1" />
        </pattern>
      )
    };
  } else if (name.includes('autotronics') || name.includes('أوتوترونكس')) {
    theme = {
      color: 'bg-zinc-100/50 dark:bg-[#0D1117]',
      pattern: 'opacity-[0.1] dark:opacity-[0.15]',
      svg: (
        <pattern id="chat-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M0 40 L80 40 M40 0 L40 80" fill="none" stroke="currentColor" strokeWidth="0.3" />
          <path d="M10 10 Q 40 0, 70 10 Q 80 40, 70 70 Q 40 80, 10 70 Q 0 40, 10 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </pattern>
      )
    };
  } else if (name.includes('renewable') || name.includes('طاقة متجددة')) {
    theme = {
      color: 'bg-emerald-50/40 dark:bg-[#0C161C]',
      pattern: 'opacity-[0.15] dark:opacity-[0.25]',
      svg: (
        <pattern id="chat-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M50 10 L50 90 M10 50 L90 50" stroke="currentColor" strokeWidth="0.2" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <path d="M30 30 L70 70 M70 30 L30 70" stroke="currentColor" strokeWidth="0.3" />
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
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/10 pointer-events-none" />
    </div>
  );
};

export default ChatBackground;
