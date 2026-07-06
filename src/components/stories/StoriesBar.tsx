import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import SmartAvatarImage from '@/components/SmartAvatarImage';
import StoryViewer from './StoryViewer';
import StoryCreator from './StoryCreator';
import type { StoryRow } from '@/lib/stories';

interface UserStories {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  stories: StoryRow[];
  hasUnseen: boolean;
}

export default function StoriesBar() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<UserStories[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const { data: stories } = await supabase
      .from('stories' as any)
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }) as any;

    if (!stories || stories.length === 0) { setGroups([]); setLoading(false); return; }

    const authorIds: string[] = Array.from(new Set((stories as any[]).map((s) => String(s.author_id))));
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', authorIds);
    const profMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    // Seen stories for current user
    let seen = new Set<string>();
    if (user) {
      const storyIds: string[] = (stories as any[]).map((s) => String(s.id));
      const { data: views } = await supabase
        .from('story_views' as any)
        .select('story_id')
        .eq('viewer_id', user.id)
        .in('story_id', storyIds) as any;
      seen = new Set((views || []).map((v: any) => v.story_id));
    }
    setSeenIds(seen);

    // Group by author
    const map = new Map<string, UserStories>();
    for (const s of stories as StoryRow[]) {
      const g = map.get(s.author_id) || {
        user_id: s.author_id,
        full_name: (profMap.get(s.author_id) as any)?.full_name || null,
        avatar_url: (profMap.get(s.author_id) as any)?.avatar_url || null,
        stories: [],
        hasUnseen: false,
      };
      g.stories.push(s);
      if (!seen.has(s.id) && s.author_id !== user?.id) g.hasUnseen = true;
      map.set(s.author_id, g);
    }
    // Own group first, then unseen, then rest
    const arr = Array.from(map.values()).sort((a, b) => {
      if (a.user_id === user?.id) return -1;
      if (b.user_id === user?.id) return 1;
      if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
      return 0;
    });
    setGroups(arr);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const myGroupIndex = useMemo(() => groups.findIndex((g) => g.user_id === user?.id), [groups, user?.id]);
  const hasOwn = myGroupIndex >= 0;

  return (
    <>
      <div className="mb-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 pb-1">
          {/* Create own */}
          {!hasOwn && (
            <button
              onClick={() => setCreatorOpen(true)}
              className="flex w-16 flex-shrink-0 flex-col items-center gap-1.5 focus:outline-none"
            >
              <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 p-[2px] transition group-hover:scale-105">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-card border-2 border-dashed border-primary/50">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
              </div>
              <span className="w-full truncate text-center text-[10px] text-muted-foreground">قصتك</span>
            </button>
          )}

          {loading && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex w-16 flex-shrink-0 flex-col items-center gap-1.5">
              <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
              <div className="h-2 w-12 rounded bg-muted animate-pulse" />
            </div>
          ))}

          {groups.map((g, idx) => {
            const isOwn = g.user_id === user?.id;
            const gradient = g.hasUnseen
              ? 'bg-gradient-to-tr from-fuchsia-500 via-orange-400 to-yellow-400'
              : 'bg-muted-foreground/30';
            return (
              <motion.button
                key={g.user_id}
                whileTap={{ scale: 0.94 }}
                onClick={() => setViewerIndex(idx)}
                className="group flex w-16 flex-shrink-0 flex-col items-center gap-1.5 focus:outline-none"
              >
                <div className={`relative h-16 w-16 rounded-full p-[2.5px] ${gradient} transition`}>
                  <div className="h-full w-full rounded-full bg-card p-[2px]">
                    <Avatar className="h-full w-full">
                      <SmartAvatarImage src={g.avatar_url} className="object-cover" />
                      <AvatarFallback className="text-xs">
                        {(g.full_name || '?').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {isOwn && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setCreatorOpen(true); }}
                      className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <span className="w-full truncate text-center text-[10px] font-medium">
                  {isOwn ? 'قصتك' : (g.full_name?.split(' ')[0] || 'مستخدم')}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {viewerIndex !== null && (
        <StoryViewer
          groups={groups}
          initialGroupIndex={viewerIndex}
          seenIds={seenIds}
          onClose={() => { setViewerIndex(null); load(); }}
        />
      )}

      {creatorOpen && (
        <StoryCreator onClose={() => { setCreatorOpen(false); load(); }} />
      )}
    </>
  );
}
