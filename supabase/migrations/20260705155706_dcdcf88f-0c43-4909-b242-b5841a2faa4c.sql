
-- 1) is_ta flag on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_ta boolean NOT NULL DEFAULT false;

-- 2) admin_invites table
CREATE TABLE IF NOT EXISTS public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  label text,
  created_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  used_at timestamptz,
  used_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_invites TO authenticated;
GRANT ALL ON public.admin_invites TO service_role;

ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invites"
  ON public.admin_invites FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) redeem function (SECURITY DEFINER): any authenticated user can redeem a valid token
CREATE OR REPLACE FUNCTION public.redeem_admin_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO inv FROM public.admin_invites WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;
  IF inv.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_used');
  END IF;
  IF inv.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  INSERT INTO public.user_roles(user_id, role)
  VALUES (uid, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.admin_invites
    SET used_at = now(), used_by = uid
    WHERE id = inv.id;

  RETURN jsonb_build_object('ok', true);
END $$;

GRANT EXECUTE ON FUNCTION public.redeem_admin_invite(text) TO authenticated;

-- 4) default avatars: use dicebear seeded URLs (40 seeds)
CREATE OR REPLACE FUNCTION public.assign_random_avatar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seeds text[] := ARRAY[
    'aurora','blaze','coral','delta','ember','frost','glacier','harbor',
    'iris','jade','kite','lumen','moss','nova','onyx','pearl',
    'quartz','ridge','sable','tide','umber','vine','willow','xenon',
    'yarrow','zephyr','amber','basil','citrine','dune','echo','fable',
    'grove','haze','indigo','juniper','koi','lark','mica','nectar'
  ];
  s text;
  styles text[] := ARRAY['notionists','adventurer','avataaars','fun-emoji','lorelei','micah','open-peeps','personas'];
  style text;
BEGIN
  IF NEW.avatar_url IS NULL OR length(trim(NEW.avatar_url)) = 0 THEN
    s := seeds[1 + floor(random() * array_length(seeds,1))::int];
    style := styles[1 + floor(random() * array_length(styles,1))::int];
    NEW.avatar_url := 'https://api.dicebear.com/7.x/' || style || '/svg?seed=' || s || '-' || substr(md5(random()::text), 1, 6);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_profiles_assign_avatar ON public.profiles;
CREATE TRIGGER trg_profiles_assign_avatar
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_random_avatar();

-- Backfill for existing profiles without avatar
UPDATE public.profiles
SET avatar_url = 'https://api.dicebear.com/7.x/' ||
  (ARRAY['notionists','adventurer','avataaars','fun-emoji','lorelei','micah','open-peeps','personas'])[1 + floor(random()*8)::int]
  || '/svg?seed=' || substr(md5(id::text || random()::text), 1, 10)
WHERE avatar_url IS NULL OR length(trim(avatar_url)) = 0;
