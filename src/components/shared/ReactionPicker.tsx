import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Laugh, ThumbsUp, ThumbsDown, Frown, Angry } from 'lucide-react';

export type ReactionType = 'like' | 'dislike' | 'love' | 'haha' | 'sad' | 'angry';

interface ReactionPickerProps {
  onSelect: (type: ReactionType) => void;
  onClose: () => void;
  isOpen: boolean;
  /** Which horizontal edge the bar is anchored to. */
  align?: 'start' | 'end';
  /** Highlight the currently selected reaction. */
  active?: ReactionType | null;
}

export const REACTIONS: { type: ReactionType; icon: any; color: string; label: string; labelAr: string }[] = [
  { type: 'like', icon: ThumbsUp, color: 'text-blue-500', label: 'Like', labelAr: 'أعجبني' },
  { type: 'love', icon: Heart, color: 'text-rose-500', label: 'Love', labelAr: 'أحببته' },
  { type: 'haha', icon: Laugh, color: 'text-amber-500', label: 'Haha', labelAr: 'أضحكني' },
  { type: 'sad', icon: Frown, color: 'text-sky-500', label: 'Sad', labelAr: 'أحزنني' },
  { type: 'angry', icon: Angry, color: 'text-orange-600', label: 'Angry', labelAr: 'أغضبني' },
  { type: 'dislike', icon: ThumbsDown, color: 'text-slate-500', label: 'Dislike', labelAr: 'لم يعجبني' },
];

export function ReactionPicker({ onSelect, onClose, isOpen, align = 'start', active }: ReactionPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: Event) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 8 }}
          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
          className={`absolute bottom-full z-50 mb-2 flex items-center gap-0.5 rounded-full border border-border/60 bg-card/95 px-1.5 py-1 shadow-elevated backdrop-blur-xl ${
            align === 'end' ? 'end-0' : 'start-0'
          }`}
        >
          {REACTIONS.map((r, i) => (
            <motion.button
              key={r.type}
              type="button"
              initial={{ scale: 0, y: 6 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: i * 0.035, type: 'spring', stiffness: 500, damping: 20 }}
              whileHover={{ scale: 1.35, y: -6 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(r.type);
                onClose();
              }}
              className={`grid h-8 w-8 place-items-center rounded-full transition-colors ${r.color} ${
                active === r.type ? 'bg-muted ring-2 ring-primary/40' : 'hover:bg-muted'
              }`}
              title={r.label}
              aria-label={r.label}
            >
              <r.icon className="h-[18px] w-[18px] fill-current" />
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
