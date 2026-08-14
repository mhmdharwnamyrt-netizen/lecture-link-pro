import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Lightweight bilingual dictionary for the Materials + Study Groups modules.
 * Format: key -> [English, Arabic]. Supports {name} interpolation.
 */
const dict = {
  // ---------- Materials ----------
  'm.brand': ['Lecture Materials', 'نظام المحاضرات'],
  'm.title': ['Lecture Materials', 'مواد المحاضرات'],
  'm.subtitle.creator': [
    'Upload your lecture files and track who viewed and downloaded them.',
    'ارفع ملفات محاضراتك وتابع من شاهدها ومن حمّلها.',
  ],
  'm.subtitle.student': [
    'All the lecture files for your department and year, in one place.',
    'كل ملفات محاضرات قسمك وفرقتك في مكان واحد.',
  ],
  'm.upload': ['Upload lecture', 'رفع محاضرة'],
  'm.stat.materials': ['Lectures', 'محاضرة'],
  'm.stat.views': ['Views', 'مشاهدة'],
  'm.stat.downloads': ['Downloads', 'تحميل'],
  'm.search': ['Search by title, subject or tag…', 'ابحث بعنوان المحاضرة أو المادة أو الوسم...'],
  'm.allSubjects': ['All subjects', 'كل المواد'],
  'm.empty.creator': ["You haven't uploaded any lectures yet.", 'لم ترفع أي محاضرة بعد.'],
  'm.empty.student': ['No lectures available for you right now.', 'لا توجد محاضرات متاحة لك حاليًا.'],
  'm.draft': ['Draft', 'مسودة'],
  'm.year': ['Year {n}', 'الفرقة {n}'],
  'm.files': ['{n} files', '{n} ملف'],
  'm.edit': ['Edit', 'تعديل'],
  'm.stats': ['Statistics', 'الإحصائيات'],
  'm.delete': ['Delete', 'حذف'],
  'm.open': ['Open', 'فتح'],

  // editor
  'm.ed.new': ['Upload a new lecture', 'رفع محاضرة جديدة'],
  'm.ed.edit': ['Edit lecture', 'تعديل المحاضرة'],
  'm.ed.title': ['Lecture title *', 'عنوان المحاضرة *'],
  'm.ed.titlePh': ['e.g. Lecture 1 — Introduction to Networks', 'مثال: المحاضرة الأولى — مقدمة في الشبكات'],
  'm.ed.desc': ['Description (optional)', 'الوصف (اختياري)'],
  'm.ed.descPh': ['A short summary of the lecture content…', 'نبذة قصيرة عن محتوى المحاضرة...'],
  'm.ed.dept': ['Department', 'القسم'],
  'm.ed.level': ['Year', 'الفرقة'],
  'm.ed.subject': ['Subject', 'المادة'],
  'm.ed.tags': ['Tags (optional)', 'وسوم (اختياري)'],
  'm.ed.tagsPh': ['networks, first term', 'شبكات، الفصل الأول'],
  'm.ed.publish': ['Publish to students', 'نشر للطلاب'],
  'm.ed.publishHint': [
    'When off, the lecture stays a private draft.',
    'عند الإيقاف تبقى المحاضرة مسودة لديك فقط.',
  ],
  'm.ed.files': ['Lecture files', 'ملفات المحاضرة'],
  'm.ed.pick': ['Tap to choose files', 'اضغط لاختيار الملفات'],
  'm.ed.pickHint': [
    'PDF, Word, Excel, PowerPoint, images — up to {n}MB per file',
    'PDF, Word, Excel, PowerPoint, صور — حتى {n} ميجابايت للملف',
  ],
  'm.ed.save': ['Save changes', 'حفظ التعديلات'],
  'm.ed.create': ['Upload & publish', 'رفع ونشر'],
  'm.ed.saving': ['Saving…', 'جارٍ الحفظ...'],
  'm.ed.uploading': ['Uploading {i} of {n}…', 'جارٍ رفع {i} من {n}...'],
  'm.ed.needTitle': ['Please enter a lecture title', 'اكتب عنوان المحاضرة'],
  'm.ed.needFile': ['Add at least one file', 'أضف ملفًا واحدًا على الأقل'],
  'm.ed.tooBig': ['{name} is larger than {n}MB', 'الملف {name} أكبر من {n} ميجابايت'],
  'm.ed.created': ['Lecture uploaded successfully', 'تم رفع المحاضرة بنجاح'],
  'm.ed.updated': ['Lecture updated', 'تم تحديث المحاضرة'],

  // detail
  'm.d.notFound': ['This lecture is not available.', 'المحاضرة غير متاحة.'],
  'm.d.viewsN': ['{n} views', '{n} مشاهدة'],
  'm.d.downloadsN': ['{n} downloads', '{n} تحميل'],
  'm.d.fullscreen': ['Full screen', 'ملء الشاشة'],
  'm.d.download': ['Download', 'تحميل'],
  'm.d.allFiles': ['All files', 'كل الملفات'],
  'm.d.noPreview': [
    'This file type cannot be previewed in the browser — download it to open.',
    'لا يمكن معاينة هذا النوع داخل المتصفح — حمّل الملف لفتحه.',
  ],
  'm.d.confirmDelete': [
    'Delete this lecture and all of its files?',
    'حذف هذه المحاضرة وكل ملفاتها؟',
  ],
  'm.d.deleted': ['Lecture deleted', 'تم حذف المحاضرة'],
  'm.d.dlFailed': ['Download failed', 'تعذّر التحميل'],

  // stats
  'm.s.title': ['Lecture statistics', 'إحصائيات المحاضرة'],
  'm.s.viewers': ['Viewers', 'شاهدوها'],
  'm.s.downloaders': ['Downloaders', 'حمّلوها'],
  'm.s.search': ['Search by name or student ID…', 'ابحث باسم الطالب أو الرقم الجامعي...'],
  'm.s.tabViews': ['Viewed ({n})', 'من شاهدها ({n})'],
  'm.s.tabDownloads': ['Downloaded ({n})', 'من حمّلها ({n})'],
  'm.s.noViews': ['Nobody has viewed it yet.', 'لم يشاهدها أحد بعد.'],
  'm.s.noDownloads': ['Nobody has downloaded it yet.', 'لم يحمّلها أحد بعد.'],
  'm.s.user': ['User', 'مستخدم'],

  // ---------- Study Groups ----------
  'g.nav': ['Study Groups', 'المجموعات الدراسية'],
  'g.title': ['Study Groups', 'المجموعات الدراسية'],
  'g.subtitle.student': [
    'Your class group — chat, share files and stay in sync.',
    'مجموعة دفعتك — تواصل، شارك الملفات، وابقَ على اطّلاع.',
  ],
  'g.subtitle.staff': [
    'Every group for the departments and years you teach.',
    'كل مجموعات الأقسام والفرق التي تُدرّس لها.',
  ],
  'g.empty': [
    'No groups yet. Groups are created from your department and year.',
    'لا توجد مجموعات بعد. تُنشأ المجموعات تلقائيًا حسب قسمك وفرقتك.',
  ],
  'g.members': ['Members', 'الأعضاء'],
  'g.membersN': ['{n} members', '{n} عضو'],
  'g.staff': ['Staff', 'هيئة التدريس'],
  'g.students': ['Students', 'الطلاب'],
  'g.admin': ['Admin', 'مشرف'],
  'g.ta': ['Teaching Assistant', 'معيد'],
  'g.doctor': ['Doctor', 'دكتور'],
  'g.student': ['Student', 'طالب'],
  'g.placeholder': ['Write a message…', 'اكتب رسالة...'],
  'g.send': ['Send', 'إرسال'],
  'g.noMessages': ['No messages yet — say hello 👋', 'لا توجد رسائل بعد — ابدأ المحادثة 👋'],
  'g.showMore': ['Show more', 'عرض المزيد'],
  'g.showLess': ['Show less', 'عرض أقل'],
  'g.reply': ['Reply', 'رد'],
  'g.replyingTo': ['Replying to {name}', 'رد على {name}'],
  'g.edited': ['edited', 'مُعدَّلة'],
  'g.deletedMsg': ['This message was deleted', 'تم حذف هذه الرسالة'],
  'g.seenBy': ['Seen by {n}', 'شاهدها {n}'],
  'g.seenList': ['Seen by', 'شاهدها'],
  'g.noSeen': ['Nobody has seen it yet.', 'لم يشاهدها أحد بعد.'],
  'g.recording': ['Recording…', 'جارٍ التسجيل...'],
  'g.record': ['Record voice', 'تسجيل صوتي'],
  'g.stop': ['Stop', 'إيقاف'],
  'g.attach': ['Attach file', 'إرفاق ملف'],
  'g.photo': ['Photo / Video', 'صورة / فيديو'],
  'g.micDenied': ['Microphone permission denied', 'تم رفض إذن الميكروفون'],
  'g.tooBig': ['File is larger than {n}MB', 'حجم الملف أكبر من {n} ميجابايت'],
  'g.confirmDelete': ['Delete this message?', 'حذف هذه الرسالة؟'],
  'g.editMsg': ['Edit message', 'تعديل الرسالة'],
  'g.sendFailed': ['Could not send the message', 'تعذّر إرسال الرسالة'],
  'g.notMember': ['You are not a member of this group.', 'أنت لست عضوًا في هذه المجموعة.'],
  'g.voice': ['Voice message', 'رسالة صوتية'],
  'g.yearLabel': ['Year {n}', 'الفرقة {n}'],
  'g.online': ['Group chat', 'محادثة جماعية'],
  'g.viewMembers': ['View members', 'عرض الأعضاء'],
  'g.you': ['You', 'أنت'],

  /* --- search --- */
  'g.search': ['Search messages…', 'ابحث في الرسائل...'],
  'g.searchOpen': ['Search', 'بحث'],
  'g.searchBySender': ['Sender', 'المرسل'],
  'g.searchAll': ['Everyone', 'الجميع'],
  'g.searchResults': ['{n} results', '{n} نتيجة'],
  'g.searchNone': ['No matching messages', 'لا توجد رسائل مطابقة'],
  'g.clear': ['Clear', 'مسح'],

  /* --- read receipts --- */
  'g.seenAt': ['Seen {time}', 'شوهدت {time}'],
  'g.delivered': ['Delivered', 'تم التسليم'],
  'g.seenByAll': ['Seen by everyone', 'شاهدها الجميع'],
  'g.notSeenYet': ['Not seen yet', 'لم تتم المشاهدة بعد'],
  'g.cancel': ['Cancel', 'إلغاء'],
  'g.sendReport': ['Send report', 'إرسال البلاغ'],
  'g.blockUser': ['Block user', 'حظر المستخدم'],

  /* --- moderation --- */
  'g.report': ['Report', 'إبلاغ'],
  'g.reportMsg': ['Report message', 'الإبلاغ عن الرسالة'],
  'g.reportUser': ['Report user', 'الإبلاغ عن المستخدم'],
  'g.reportReason': ['Reason', 'سبب البلاغ'],
  'g.reportDetails': ['More details (optional)', 'تفاصيل إضافية (اختياري)'],
  'g.reportSend': ['Send report', 'إرسال البلاغ'],
  'g.reportDone': ['Report sent to moderators', 'تم إرسال البلاغ إلى الإشراف'],
  'g.block': ['Block user', 'حظر المستخدم'],
  'g.unblock': ['Unblock', 'إلغاء الحظر'],
  'g.blocked': ['User blocked — messages hidden', 'تم حظر المستخدم — رسائله مخفية'],
  'g.unblocked': ['User unblocked', 'تم إلغاء الحظر'],
  'g.blockedCount': ['{n} blocked', '{n} محظور'],
  'g.blockedList': ['Blocked users', 'المستخدمون المحظورون'],
  'g.blockedHidden': ['Message from a blocked user', 'رسالة من مستخدم محظور'],
  'g.confirmBlock': ['Block this user? Their messages will be hidden from you.', 'حظر هذا المستخدم؟ لن تظهر لك رسائله.'],
  'g.more': ['More', 'المزيد'],

  /* --- push --- */
  'g.pushOn': ['Notifications enabled', 'تم تفعيل الإشعارات'],
  'g.pushOff': ['Notifications blocked by the browser', 'المتصفح يمنع الإشعارات'],
  'g.enablePush': ['Enable notifications', 'تفعيل الإشعارات'],
  'g.newReply': ['New reply from {name}', 'رد جديد من {name}'],
  'g.newReaction': ['{name} reacted to your message', '{name} تفاعل مع رسالتك'],
} as const;

export type TxKey = keyof typeof dict;

export function useTx() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const idx = isAr ? 1 : 0;

  const tx = (key: TxKey, vars?: Record<string, string | number>) => {
    let out: string = dict[key]?.[idx] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return out;
  };

  return {
    tx,
    isAr,
    isRTL: isAr,
    locale: isAr ? 'ar-EG' : 'en-GB',
    /** Picks the localized name from a { name, name_ar } shaped record. */
    pickName: (rec?: { name?: string | null; name_ar?: string | null } | null) =>
      (isAr ? rec?.name_ar || rec?.name : rec?.name || rec?.name_ar) || '',
  };
}
