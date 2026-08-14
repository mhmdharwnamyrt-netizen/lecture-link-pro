import { supabase } from '@/integrations/supabase/client';

export const REPORT_REASONS = [
  { key: 'spam', ar: 'رسائل مزعجة / سبام', en: 'Spam' },
  { key: 'harassment', ar: 'تنمّر أو إساءة', en: 'Harassment or abuse' },
  { key: 'inappropriate', ar: 'محتوى غير لائق', en: 'Inappropriate content' },
  { key: 'misinformation', ar: 'معلومات مضللة', en: 'Misinformation' },
  { key: 'off_topic', ar: 'خارج موضوع المجموعة', en: 'Off topic' },
  { key: 'other', ar: 'سبب آخر', en: 'Other' },
] as const;

export type ReportReasonKey = (typeof REPORT_REASONS)[number]['key'];

export interface ChatReportInput {
  reporterId: string;
  reportedUserId: string;
  groupId: string;
  messageId?: string | null;
  contentSnapshot?: string | null;
  reason: string;
  details?: string | null;
}

export async function submitChatReport(input: ChatReportInput) {
  const { error } = await supabase.from('chat_reports' as any).insert({
    reporter_id: input.reporterId,
    reported_user_id: input.reportedUserId,
    group_id: input.groupId,
    message_id: input.messageId ?? null,
    content_snapshot: input.contentSnapshot ?? null,
    reason: input.reason,
    details: input.details ?? null,
  });
  if (error) throw error;
}

/** user_ids the signed-in user has blocked */
export async function fetchBlockedIds(myUserId: string): Promise<string[]> {
  const { data } = await supabase
    .from('user_blocks' as any)
    .select('blocked_id')
    .eq('blocker_id', myUserId);
  return ((data as any[]) || []).map((r) => r.blocked_id);
}

export async function blockUser(myUserId: string, targetUserId: string) {
  const { error } = await supabase
    .from('user_blocks' as any)
    .insert({ blocker_id: myUserId, blocked_id: targetUserId });
  if (error && !/duplicate/i.test(error.message)) throw error;
}

export async function unblockUser(myUserId: string, targetUserId: string) {
  const { error } = await supabase
    .from('user_blocks' as any)
    .delete()
    .eq('blocker_id', myUserId)
    .eq('blocked_id', targetUserId);
  if (error) throw error;
}
