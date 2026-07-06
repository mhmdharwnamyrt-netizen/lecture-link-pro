# خطة التنفيذ الشاملة

طلبك يحتوي عدة أنظمة كبيرة. سأنفّذها على مراحل مرتبة بعد موافقتك، لأنها ضخمة ولا يمكن ضغطها في دفعة واحدة بجودة عالية.

---

## المرحلة 1 — تحققات وإصلاحات سريعة (قبل أي بناء جديد)

1. **وضع إجازة الصيف (Summer Mode)**
   - التأكد أن `StudentDashboard` يخفي كروت المحاضرات ويعرض: التدريبات، آخر منشورات الملتقى، إحصائيات (الحضور، النقاط، الترتيب).
   - إضافة نفس المنطق (Summer Mode) لـ `DoctorDashboard` و`TeachingAssistant` (نفس شاشة الدكتور).
2. **أزرار المراسلة والمتابعة على الموبايل**
   - فحص `PublicProfile.tsx` على viewport موبايل (Playwright) والتأكد أن الأزرار ظاهرة، sticky، وتشتغل.
3. **Skeleton + Fallback لـ SmartAvatarImage**
   - تعديل `SmartAvatarImage` لعرض `Skeleton` أثناء التحميل، و`AvatarFallback` عند الفشل، بدل إرجاع `null`.
   - تطبيقه في `Community.tsx`.
4. **مراجعة سياسات RLS للـ TA**
   - قراءة كل السياسات التي تعتمد على `role = 'doctor'` وإضافة شرط `OR is_ta = true` إن لزم، أو الاعتماد على `has_role(auth.uid(), 'doctor')` (TA حاليًا يُسجَّل كـ doctor فيرث الصلاحيات — سنؤكد ذلك عبر `supabase--read_query`).
5. **Build + tsgo** بعد التعديلات.

---

## المرحلة 2 — نظام Stories/الحالات (كامل)

**قاعدة البيانات (Migration):**
- `stories` (id, author_id, media_type: image|video|text, media_path, text_content, background, duration_seconds, views_count, created_at, expires_at = created_at + 24h)
- `story_views` (id, story_id, viewer_id, viewed_at) — UNIQUE(story_id, viewer_id)
- Trigger لزيادة `views_count` عند INSERT في `story_views`.
- RLS: يقرأ الجميع القصص غير المنتهية؛ صاحب القصة فقط يرى قائمة المشاهدين؛ يحذف صاحبها أو Cron.
- Bucket جديد `stories` (خاص، signed URLs).

**الواجهة:**
- `StoriesBar` أعلى صفحة الملتقى (شرائط دائرية بحواف gradient، تمييز غير مشاهَد).
- `StoryViewer` (fullscreen، تقدم أوتوماتيكي، ضغطة يمين/يسار، سحب للإغلاق، Framer Motion).
- `StoryCreator`: التقاط/رفع صورة، فيديو (قص تلقائي عند 60 ثانية عبر `ffmpeg.wasm` أو التحقق فقط ورفض >60s كخطوة أولى)، أو قصة نصية بخلفيات gradient.
- شاشة "من شاهد قصتك" لصاحبها فقط (قائمة أفاتار + وقت).

**الأداء:** Signed URL caching، Skeletons، Preload للصورة التالية.

---

## المرحلة 3 — إعادة تصميم Modern (Design System pass)

- ترقية الألوان في `index.css` (طبقة gradients، shadows ناعمة، دعم Dark أفضل).
- Motion موحّد (Framer): `AnimatePresence` لفتح/إغلاق البطاقات والحوارات، easing انسيابي.
- بطاقات بحواف مدوّرة، خلفيات glassmorphism خفيفة، ميكرو-تفاعلات على الأزرار.
- سيُطبَّق أولًا على: Community, Profile, Trainings, Dashboards (وأي مكوّن جديد نبنيه من الآن).

---

## المرحلة 4 — التدريبات: AI Autofill + صلاحيات الطلاب

- **إضافة صلاحية الطالب لإنشاء تدريب** بوضع **رابط خارجي فقط** (لا نموذج داخلي). الدكتور/المعيد فقط يقدرون يعملوا Internal Form ويشوفوا الردود. (تعديل UI + RLS check).
- **AI Autofill** في `TrainingCreate.tsx`:
  - زر "استخراج تلقائي من نص" في الخطوة 1.
  - Edge Function `training-extract` يستقبل النص، يستدعي Lovable AI (`google/gemini-3-flash-preview`) بمخطط JSON: `{title, company_name, location, deadline, tags[]}`، ويرجّع القيم.
  - تعبئة الحقول تلقائيًا مع إشعار toast.

---

## المرحلة 5 — QA نهائي

- تشغيل Playwright على: Community + Stories + Profile موبايل + Training create كطالب/دكتور.
- `tsgo` + build check.
- تقرير مختصر بالنتائج.

---

## ملاحظة مهمة حول الحجم

هذه ~5 مراحل ضخمة (خصوصًا نظام Stories = يوم كامل من العمل عادةً). أقترح:
- **الموافقة على الخطة كاملة** ثم أبدأ بالمرحلة 1 و2 في هذه الجولة، وأكمل 3-4-5 في الجولات التالية.
- أو أخبرني أي مرحلة تريد **البدء بها الآن** إذا كانت الأولوية مختلفة.
