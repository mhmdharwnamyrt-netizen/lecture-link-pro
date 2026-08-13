import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Smile, ThumbsUp, ThumbsDown, Frown, Angry } from 'lucide-react';

export type ReactionType = 'like' | 'dislike' | 'love' | 'haha' | 'sad' | 'angry';

interface ReactionPickerProps {
  onSelect: (type: ReactionType) => void;
  onClose: () => void;
  isOpen: boolean;
}

const reactions: { type: ReactionType; icon: any; color: string; label: string; labelAr: string }[] = [
  { type: 'like', icon: ThumbsUp, color: 'text-blue-500', label: 'Like', labelAr: 'أعجبني' },
  { type: 'dislike', icon: ThumbsDown, color: 'text-gray-500', label: 'Dislike', labelAr: 'لم يعجبني' },
  { type: 'love', icon: Heart, color: 'text-red-500', label: 'Love', labelAr: 'أحببته' },
  { type: 'haha', icon: Smile, color: 'text-yellow-500', label: 'Haha', labelAr: 'أضحكني' },
  { type: 'sad', icon: Frown, color: 'text-blue-400', label: 'Sad', labelAr: 'أحزنني' },
  { type: 'angry', icon: Angry, color: 'text-orange-600', label: 'Angry', labelAr: 'أغضبني' },
];

export function ReactionPicker({ onSelect, onClose, isOpen }: ReactionPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.5, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 10 }}
          className="absolute bottom-full left-0 z-50 mb-2 flex items-center gap-1 rounded-full border border-border/50 bg-card p-1 shadow-elevated"
        >
          {reactions.map((r, i) => (
            <motion.button
              key={r.type}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.3, y: -5 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(r.type);
                onClose();
              }}
              className={`grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-muted ${r.color}`}
              title={r.label}
            >
              <r.icon className="h-5 w-5 fill-current" />
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
