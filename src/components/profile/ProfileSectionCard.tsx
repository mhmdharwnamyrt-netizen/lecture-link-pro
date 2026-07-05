import { useState, useEffect } from 'react';
import { Sparkles, Plus, Pencil, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

/** A single optional profile section. Renders empty-state "Add" card if no value,
 *  or a filled card with inline edit. Saves to `profiles.<field>` in Cloud. */
type Kind = 'text' | 'tags';

interface Props {
  field: 'bio' | 'skills' | 'interests' | 'hobbies' | 'favorites';
  kind: Kind;
  icon: React.ComponentType<{ className?: string }>;
  labelAr: string;
  labelEn: string;
  placeholderAr: string;
  placeholderEn: string;
  tint?: string; // tailwind gradient like 'from-violet-500/15 to-fuchsia-500/5'
}

export default function ProfileSectionCard({
  field, kind, icon: Icon, labelAr, labelEn, placeholderAr, placeholderEn,
  tint = 'from-primary/15 to-accent/5',
}: Props) {
  const { profile, refreshProfile } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const isAr = language === 'ar';
  const label = isAr ? labelAr : labelEn;

  const current = (profile as any)?.[field];
  const initialText = kind === 'text' ? (current || '') : '';
  const initialTags: string[] = kind === 'tags' ? (Array.isArray(current) ? current : []) : [];

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState<string>(initialText);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setText(kind === 'text' ? (current || '') : '');
    setTags(kind === 'tags' ? (Array.isArray(current) ? current : []) : []);
  }, [current, kind]);

  const isEmpty = kind === 'text' ? !text.trim() : tags.length === 0;
  const hasSavedValue = kind === 'text' ? !!(current && String(current).trim()) : Array.isArray(current) && current.length > 0;

  const addTag = () => {
    const v = input.trim();
    if (!v || tags.includes(v) || tags.length >= 15) return;
    setTags([...tags, v]);
    setInput('');
  };

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    const value = kind === 'text' ? (text.trim() || null) : tags;
    const { error } = await supabase.from('profiles').update({ [field]: value } as any).eq('id', profile.id);
    setSaving(false);
    if (error) {
      toast({ title: isAr ? 'فشل الحفظ' : 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    await refreshProfile();
    setEditing(false);
    toast({ title: isAr ? 'تم التحديث' : 'Updated' });
  };

  const cancel = () => {
    setText(kind === 'text' ? (current || '') : '');
    setTags(kind === 'tags' ? (Array.isArray(current) ? current : []) : []);
    setInput('');
    setEditing(false);
  };

  // Empty state — collapsed "Add" card
  if (!editing && !hasSavedValue) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`group relative w-full overflow-hidden rounded-2xl border border-dashed border-border/70 bg-gradient-to-br ${tint} p-4 text-start transition hover:border-primary/50 hover:shadow-card`}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-background/70 text-primary shadow-sm ring-1 ring-border/40 transition group-hover:scale-110">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-xs text-muted-foreground">
              {isAr ? 'اختياري — اضغط للإضافة' : 'Optional — tap to add'}
            </p>
          </div>
          <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
            <Plus className="h-4 w-4" />
          </div>
        </div>
      </button>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl bg-card p-4 shadow-card ring-1 ring-border/40`}
    >
      <div className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${tint} opacity-70 pointer-events-none`} />
      <div className="relative flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">{label}</p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ) : (
          <div className="flex gap-1">
            <button
              onClick={cancel}
              disabled={saving}
              className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
              aria-label="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
              aria-label="Save"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <AnimatePresence mode="wait">
          {!editing ? (
            <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {kind === 'text' ? (
                <p className="text-sm whitespace-pre-wrap text-foreground/90">{text}</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((s, i) => (
                    <Badge key={i} variant="secondary" className="rounded-full">{s}</Badge>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {kind === 'text' ? (
                <>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, 500))}
                    placeholder={isAr ? placeholderAr : placeholderEn}
                    className="min-h-[90px]"
                    autoFocus
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">{text.length}/500</p>
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                      placeholder={isAr ? placeholderAr : placeholderEn}
                      autoFocus
                    />
                    <Button type="button" size="sm" variant="outline" onClick={addTag}>+</Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tags.map((s, i) => (
                      <Badge key={i} variant="secondary" className="rounded-full gap-1">
                        {s}
                        <button onClick={() => setTags(tags.filter((_, j) => j !== i))}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
