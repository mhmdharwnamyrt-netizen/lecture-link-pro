import { supabase } from '@/integrations/supabase/client';

export const MATERIALS_BUCKET = 'course-materials';

export interface CourseMaterial {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  subject_id: string | null;
  department_id: string | null;
  level: number | null;
  tags: string[];
  is_published: boolean;
  views_count: number;
  downloads_count: number;
  created_at: string;
  updated_at: string;
  subjects?: { name: string } | null;
  departments?: { name: string; name_ar?: string | null } | null;
}

export interface MaterialFile {
  id: string;
  material_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  order_index: number;
  created_at: string;
}

export const ACCEPTED_TYPES =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp,.gif,.zip';

export const MAX_FILE_MB = 50;

export type FileKind = 'pdf' | 'word' | 'excel' | 'powerpoint' | 'image' | 'text' | 'archive' | 'other';

export function fileKind(name: string, mime?: string | null): FileKind {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (['doc', 'docx', 'rtf', 'odt'].includes(ext)) return 'word';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return 'excel';
  if (['ppt', 'pptx', 'odp'].includes(ext)) return 'powerpoint';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) return 'image';
  if (['txt', 'md'].includes(ext)) return 'text';
  if (['zip', 'rar', '7z'].includes(ext)) return 'archive';
  return 'other';
}

export function formatBytes(bytes?: number | null) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function signedUrlFor(path: string, ttl = 3600, download?: string) {
  const { data, error } = await supabase.storage
    .from(MATERIALS_BUCKET)
    .createSignedUrl(path, ttl, download ? { download } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

/** Office documents can be previewed through the Microsoft online viewer using a signed URL. */
export function officeViewerUrl(signedUrl: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`;
}

/** Records a view once per user, then increments their personal counter. */
export async function recordMaterialView(materialId: string, userId: string) {
  const { data: existing } = await supabase
    .from('material_views' as any)
    .select('id, view_count')
    .eq('material_id', materialId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('material_views' as any)
      .update({ view_count: ((existing as any).view_count || 1) + 1, last_viewed_at: new Date().toISOString() })
      .eq('id', (existing as any).id);
  } else {
    await supabase.from('material_views' as any).insert({ material_id: materialId, user_id: userId });
  }
}

export async function recordMaterialDownload(materialId: string, userId: string, fileId?: string) {
  await supabase
    .from('material_downloads' as any)
    .insert({ material_id: materialId, user_id: userId, file_id: fileId ?? null });
}

export async function downloadMaterialFile(file: MaterialFile, userId: string) {
  const url = await signedUrlFor(file.storage_path, 600, file.file_name);
  await recordMaterialDownload(file.material_id, userId, file.id);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.file_name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
