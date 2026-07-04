import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileLayout from '@/components/MobileLayout';
import StorageImage from '@/components/StorageImage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare, GraduationCap, User, Sparkles, Star, Heart, MessageCircle, UserPlus, UserCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { createSignedUrl } from '@/lib/storage';

interface ProfileRow {
  id: string; user_id: string; full_name: string;
  avatar_url: string | null; cover_url: string | null;
  role: string; academic_title: string | null; student_id: string | null;
  department_id: string | null; level: number | null; points: number;
  bio: string | null; skills: string[] | null; interests: string[] | null;
  hobbies: string[] | null; favorites: string[] | null;
  followers_count: number; following_count: number;
}

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { profile: me } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  const t = (a: string, e: string) => (isRTL ? a : e);
  const locale = isRTL ? ar : enUS;

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [coverSrc, setCoverSrc] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const { data: prof } = await supabase
        .from('profiles')
        .select('id,user_id,full_name,avatar_url,cover_url,role,academic_title,student_id,department_id,level,points,bio,skills,interests,hobbies,favorites,followers_count,following_count')
        .eq('user_id', userId)
        .maybeSingle();
      setProfile(prof as any);
      if (prof?.cover_url) {
        createSignedUrl('face-photos', prof.cover_url, 3600).then(setCoverSrc);
      }
      const { data: pRows } = await supabase
        .from('community_posts')
        .select('id,content,image_url,likes_count,comments_count,category,is_pinned,created_at')
        .eq('author_id', userId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(30);
      setPosts(pRows || []);
      // Am I following this user?
      if (me?.user_id && me.user_id !== userId) {
        const { data: f } = await supabase
          .from('community_follows')
          .select('id')
          .eq('follower_id', me.user_id)
          .eq('following_id', userId)
          .maybeSingle();
        setIsFollowing(!!f);
      }
      setLoading(false);
    })();
  }, [userId, me?.user_id]);

  const toggleFollow = async () => {
    if (!me?.user_id || !userId || followBusy) return;
    setFollowBusy(true);
    if (isFollowing) {
      const { error } = await supabase
        .from('community_follows')
        .delete()
        .eq('follower_id', me.user_id)
        .eq('following_id', userId);
      if (!error) {
        setIsFollowing(false);
        setProfile((p) => p ? { ...p, followers_count: Math.max(0, p.followers_count - 1) } : p);
      } else toast.error(error.message);
    } else {
      const { error } = await supabase
        .from('community_follows')
        .insert({ follower_id: me.user_id, following_id: userId });
      if (!error) {
        setIsFollowing(true);
        setProfile((p) => p ? { ...p, followers_count: p.followers_count + 1 } : p);
      } else toast.error(error.message);
    }
    setFollowBusy(false);
  };

  const myRole = (me?.role as 'doctor' | 'student') || 'student';
  const isMe = me?.user_id === userId;

  const startMessage = () => {
    if (!profile) return;
    navigate(`/${myRole}/messages?to=${profile.id}`);
  };

  const Icon = profile?.role === 'doctor' ? GraduationCap : User;

  return (
    <MobileLayout role={myRole}>
      <div className="pb-8">
        {/* Cover */}
        <div className="relative -mx-4 md:-mx-8 h-44 md:h-56 overflow-hidden md:rounded-b-3xl">
          {coverSrc ? (
            <img src={coverSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a1f44] via-primary to-accent" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          <button
            onClick={() => navigate(-1)}
            className="absolute top-3 start-3 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"
            aria-label="Back"
          >
            <ArrowLeft className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Avatar & basic */}
        <div className="px-4 -mt-12 md:px-8">
          <div className="flex items-end gap-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-card ring-4 ring-background shadow-elevated">
              {profile?.avatar_url ? (
                <StorageImage
                  bucket="face-photos"
                  path={profile.avatar_url}
                  className="h-full w-full object-cover"
                  fallback={
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-accent/15">
                      <Icon className="h-1/2 w-1/2 text-primary" />
                    </div>
                  }
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-accent/15">
                  <Icon className="h-1/2 w-1/2 text-primary" />
                </div>
              )}
            </div>
            <div className="flex-1 pb-1">
              <h1 className="text-xl font-bold">{profile?.full_name || t('يتحمّل…', 'Loading…')}</h1>
              <p className="text-sm text-muted-foreground">
                {profile?.role === 'doctor'
                  ? profile?.academic_title || t('دكتور', 'Doctor')
                  : profile?.student_id
                    ? `${t('كود', 'ID')}: ${profile.student_id}`
                    : t('طالب', 'Student')}
              </p>
            </div>
          </div>

          {/* Follower stats */}
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold tabular-nums">{profile?.followers_count ?? 0}</span>
              <span className="text-muted-foreground">{t('متابع', 'followers')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold tabular-nums">{profile?.following_count ?? 0}</span>
              <span className="text-muted-foreground">{t('يتابع', 'following')}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            {!isMe ? (
              <>
                <Button
                  onClick={toggleFollow}
                  disabled={followBusy}
                  variant={isFollowing ? 'outline' : 'default'}
                  className="flex-1 h-11 rounded-xl"
                >
                  {isFollowing ? (
                    <><UserCheck className="h-4 w-4 me-2" /> {t('تتم متابعته', 'Following')}</>
                  ) : (
                    <><UserPlus className="h-4 w-4 me-2" /> {t('متابعة', 'Follow')}</>
                  )}
                </Button>
                <Button onClick={startMessage} variant="outline" className="flex-1 h-11 rounded-xl">
                  <MessageSquare className="h-4 w-4 me-2" />
                  {t('مراسلة', 'Message')}
                </Button>
              </>
            ) : (
              <Button asChild variant="outline" className="flex-1 h-11 rounded-xl">
                <Link to={`/${myRole}/profile`}>{t('تعديل الملف الشخصي', 'Edit profile')}</Link>
              </Button>
            )}
          </div>

          {/* Bio */}
          {profile?.bio && (
            <div className="mt-5 rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-semibold mb-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                {t('نبذة', 'About')}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{profile.bio}</p>
            </div>
          )}

          {[
            { key: 'skills', title: t('المهارات', 'Skills'), variant: 'secondary' as const, items: profile?.skills },
            { key: 'interests', title: t('الاهتمامات', 'Interests'), variant: 'outline' as const, items: profile?.interests },
            { key: 'hobbies', title: t('الهوايات', 'Hobbies'), variant: 'secondary' as const, items: profile?.hobbies },
            { key: 'favorites', title: t('المفضلات', 'Favorites'), variant: 'outline' as const, items: profile?.favorites },
          ].map((sec) => (sec.items && sec.items.length > 0) ? (
            <div key={sec.key} className="mt-3 rounded-2xl border bg-card p-4">
              <div className="text-sm font-semibold mb-2">{sec.title}</div>
              <div className="flex flex-wrap gap-2">
                {sec.items.map((s, i) => (
                  <Badge key={i} variant={sec.variant} className="rounded-full">{s}</Badge>
                ))}
              </div>
            </div>
          ) : null)}

          {/* Stats */}
          {profile?.role === 'student' && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border bg-card p-3 text-center">
                <Star className="h-4 w-4 mx-auto text-warning mb-1" />
                <div className="text-lg font-bold tabular-nums">{profile.points}</div>
                <div className="text-[10px] text-muted-foreground">{t('نقاط', 'Points')}</div>
              </div>
              <div className="rounded-2xl border bg-card p-3 text-center">
                <MessageCircle className="h-4 w-4 mx-auto text-primary mb-1" />
                <div className="text-lg font-bold tabular-nums">{posts.length}</div>
                <div className="text-[10px] text-muted-foreground">{t('منشورات', 'Posts')}</div>
              </div>
              <div className="rounded-2xl border bg-card p-3 text-center">
                <Heart className="h-4 w-4 mx-auto text-destructive mb-1" />
                <div className="text-lg font-bold tabular-nums">
                  {posts.reduce((s, p) => s + (p.likes_count || 0), 0)}
                </div>
                <div className="text-[10px] text-muted-foreground">{t('إعجابات', 'Likes')}</div>
              </div>
            </div>
          )}

          {/* Posts */}
          <div className="mt-6">
            <h2 className="text-base font-semibold mb-3">{t('منشورات المستخدم', 'Posts')}</h2>
            {loading ? (
              <div className="text-sm text-muted-foreground">{t('يتم التحميل…', 'Loading…')}</div>
            ) : posts.length === 0 ? (
              <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
                {t('لا توجد منشورات بعد.', 'No posts yet.')}
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((p) => (
                  <motion.article
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border bg-card p-4"
                  >
                    <div className="text-xs text-muted-foreground mb-1.5">
                      {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale })}
                    </div>
                    {p.content && (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{p.content}</p>
                    )}
                    <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" /> {p.likes_count || 0}</span>
                      <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {p.comments_count || 0}</span>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
