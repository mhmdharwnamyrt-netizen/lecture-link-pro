-- ============ Course materials (lecture files) ============
CREATE TABLE public.course_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  level integer,
  tags text[] NOT NULL DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT true,
  views_count integer NOT NULL DEFAULT 0,
  downloads_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.course_material_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.course_materials(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  file_size bigint,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.material_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.course_materials(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  view_count integer NOT NULL DEFAULT 1,
  first_viewed_at timestamptz NOT NULL DEFAULT now(),
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (material_id, user_id)
);

CREATE TABLE public.material_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.course_materials(id) ON DELETE CASCADE,
  file_id uuid REFERENCES public.course_material_files(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  downloaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_course_materials_owner ON public.course_materials(created_by);
CREATE INDEX idx_course_materials_scope ON public.course_materials(department_id, level);
CREATE INDEX idx_material_files_material ON public.course_material_files(material_id);
CREATE INDEX idx_material_views_material ON public.material_views(material_id);
CREATE INDEX idx_material_downloads_material ON public.material_downloads(material_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_materials TO authenticated;
GRANT ALL ON public.course_materials TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_material_files TO authenticated;
GRANT ALL ON public.course_material_files TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.material_views TO authenticated;
GRANT ALL ON public.material_views TO service_role;
GRANT SELECT, INSERT ON public.material_downloads TO authenticated;
GRANT ALL ON public.material_downloads TO service_role;

-- helpers -------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_material_creator_role(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _uid AND (p.role = 'doctor' OR p.is_ta = true)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_material(_material uuid, _uid uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE m RECORD; p RECORD;
BEGIN
  IF _uid IS NULL THEN RETURN false; END IF;
  SELECT * INTO m FROM public.course_materials WHERE id = _material;
  IF NOT FOUND THEN RETURN false; END IF;
  IF m.created_by = _uid THEN RETURN true; END IF;
  IF private.has_role(_uid, 'admin'::public.app_role) THEN RETURN true; END IF;
  IF NOT m.is_published THEN RETURN false; END IF;
  SELECT department_id, level INTO p FROM public.profiles WHERE user_id = _uid;
  IF NOT FOUND THEN RETURN false; END IF;
  IF m.department_id IS NOT NULL AND m.department_id IS DISTINCT FROM p.department_id THEN RETURN false; END IF;
  IF m.level IS NOT NULL AND m.level IS DISTINCT FROM p.level THEN RETURN false; END IF;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.can_access_material_path(_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_material_files f
    WHERE f.storage_path = _path
      AND public.can_view_material(f.material_id, auth.uid())
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_material_creator_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_material(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_material_path(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_material_creator_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_material(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_material_path(text) TO authenticated;

-- counters -------------------------------------------------
CREATE OR REPLACE FUNCTION public.material_views_bump()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.course_materials SET views_count = views_count + 1 WHERE id = NEW.material_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_material_views_bump AFTER INSERT ON public.material_views
FOR EACH ROW EXECUTE FUNCTION public.material_views_bump();

CREATE OR REPLACE FUNCTION public.material_downloads_bump()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.course_materials SET downloads_count = downloads_count + 1 WHERE id = NEW.material_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_material_downloads_bump AFTER INSERT ON public.material_downloads
FOR EACH ROW EXECUTE FUNCTION public.material_downloads_bump();

CREATE TRIGGER trg_course_materials_updated BEFORE UPDATE ON public.course_materials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS -------------------------------------------------
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_material_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "materials_select_visible" ON public.course_materials
FOR SELECT TO authenticated USING (public.can_view_material(id, auth.uid()));

CREATE POLICY "materials_insert_own" ON public.course_materials
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND public.is_material_creator_role(auth.uid()));

CREATE POLICY "materials_update_own" ON public.course_materials
FOR UPDATE TO authenticated
USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE POLICY "materials_delete_own" ON public.course_materials
FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "material_files_select" ON public.course_material_files
FOR SELECT TO authenticated USING (public.can_view_material(material_id, auth.uid()));

CREATE POLICY "material_files_write_owner" ON public.course_material_files
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.course_materials m WHERE m.id = material_id AND m.created_by = auth.uid()));

CREATE POLICY "material_files_update_owner" ON public.course_material_files
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.course_materials m WHERE m.id = material_id AND m.created_by = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.course_materials m WHERE m.id = material_id AND m.created_by = auth.uid()));

CREATE POLICY "material_files_delete_owner" ON public.course_material_files
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.course_materials m WHERE m.id = material_id AND m.created_by = auth.uid()));

CREATE POLICY "material_views_insert_self" ON public.material_views
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.can_view_material(material_id, auth.uid()));

CREATE POLICY "material_views_update_self" ON public.material_views
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "material_views_select" ON public.material_views
FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.course_materials m WHERE m.id = material_id AND m.created_by = auth.uid())
  OR private.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "material_downloads_insert_self" ON public.material_downloads
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.can_view_material(material_id, auth.uid()));

CREATE POLICY "material_downloads_select" ON public.material_downloads
FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.course_materials m WHERE m.id = material_id AND m.created_by = auth.uid())
  OR private.has_role(auth.uid(), 'admin'::public.app_role)
);