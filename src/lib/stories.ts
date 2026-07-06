import { supabase } from '@/integrations/supabase/client';

export const STORY_BUCKET = 'stories';
export const STORY_MAX_VIDEO_SECONDS = 60;

const signedCache = new Map<string, { url: string; exp: number }>();

export async function signedStoryUrl(path: string, ttl = 3600): Promise<string | null> {
  const now = Date.now();
  const hit = signedCache.get(path);
  if (hit && hit.exp > now) return hit.url;
  const { data } = await supabase.storage.from(STORY_BUCKET).createSignedUrl(path, ttl);
  if (data?.signedUrl) {
    signedCache.set(path, { url: data.signedUrl, exp: now + (ttl - 60) * 1000 });
    return data.signedUrl;
  }
  return null;
}

export type StoryMediaType = 'image' | 'video' | 'text';
export interface StoryRow {
  id: string;
  author_id: string;
  media_type: StoryMediaType;
  media_path: string | null;
  media_mime: string | null;
  text_content: string | null;
  background: string | null;
  duration_seconds: number;
  views_count: number;
  created_at: string;
  expires_at: string;
}

export const TEXT_BACKGROUNDS: Record<string, string> = {
  sunset: 'linear-gradient(135deg,#ff7a59,#ff4d8d,#a259ff)',
  ocean: 'linear-gradient(135deg,#0ea5e9,#22d3ee,#a7f3d0)',
  aurora: 'linear-gradient(135deg,#8b5cf6,#22c55e,#06b6d4)',
  night: 'linear-gradient(135deg,#0f172a,#1e3a8a,#312e81)',
  peach: 'linear-gradient(135deg,#fda4af,#fbbf24,#fde68a)',
  forest: 'linear-gradient(135deg,#065f46,#10b981,#a7f3d0)',
};

export async function markStoryViewed(storyId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from('story_views' as any).insert({ story_id: storyId, viewer_id: u.user.id });
}
