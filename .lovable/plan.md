# خطة نظام التدريبات + رفع الأفاتار

## الجزء الأول — نظام التدريبات المفتوح

### السلوك المطلوب
- أي **طالب / دكتور / معيد** ينتمي للكلية يقدر يضيف تدريب (بدل ما كان مقصور على الأدمن).
- منشئ التدريب يختار طريقة التقديم:
  1. **رابط خارجي** (form بره — Google Form مثلًا) — النموذج الحالي.
  2. **نموذج داخل النظام** ينشئه بنفسه، يخصّص الحقول، ويعرض الردود.
- يقدر يحدد **حد أقصى للمتقدمين** (مثلًا 30). لما يوصل الحد، النظام يقفل التقديم تلقائيًا ويعرض للطالب رقم 31 رسالة "اكتمل العدد".
- منشئ التدريب فقط + الأدمن يشوفوا الردود ويقدروا يعدلوا/يحذفوا التدريب.

### الشاشات الجديدة
1. **زر "+ إضافة تدريب"** أعلى صفحة `/{role}/trainings` لأي مستخدم مسجّل.
2. **معالج إنشاء تدريب** بخطوتين:
   - بيانات التدريب (عنوان، وصف، نوع، جهة، مكان، آخر موعد، شعار/صورة، وسوم).
   - طريقة التقديم:
     - «رابط خارجي» → لصق URL.
     - «نموذج داخلي» → منشئ حقول (Field builder): إضافة حقول من الأنواع نص قصير / نص طويل / رقم / بريد / هاتف / اختيار من متعدد / تحميل ملف اختياري / موافقة، مع تحديد المطلوب/الاختياري. وحقل «الحد الأقصى للمتقدمين» (اختياري).
3. **صفحة تفاصيل التدريب** `/{role}/trainings/:id`:
   - عرض البيانات + زر «تقديم».
   - لو رابط خارجي: يفتح الرابط.
   - لو نموذج داخلي: يعرض النموذج ويقبل الرد. لو المستخدم قدّم قبل كده يعرض «تم تقديمك». لو العدد اكتمل يعرض «اكتمل عدد المتقدمين».
4. **لوحة إدارة التدريب لمنشئه** `/{role}/trainings/:id/manage`:
   - جدول الردود (تصدير CSV)، عدّاد X من Y، تفعيل/إغلاق يدوي، تعديل/حذف.

### قواعد الأمان (RLS)
- `trainings.INSERT`: مسموح لأي `authenticated`؛ `created_by = auth.uid()` إلزامي.
- `trainings.UPDATE/DELETE`: `created_by = auth.uid()` أو أدمن.
- `training_form_fields`: نفس مالك التدريب فقط (+ أدمن) للكتابة؛ قراءة عامة للمصادَقين.
- `training_applications`:
  - **INSERT**: أي مصادَق يقدّم على تدريبه، وواحد فقط لكل تدريب (`UNIQUE(training_id, applicant_id)`).
  - **SELECT**: المتقدم يشوف رده فقط؛ منشئ التدريب + الأدمن يشوفوا كل الردود.
- إغلاق تلقائي عبر **Trigger** بعد كل `INSERT` ناجح: لو `applications_count >= max_applicants` يخلي `is_active=false`.

### التغييرات على الواجهة
- إعادة تصميم بطاقة التدريب لعرض **عدد المتقدمين / السعة** مع شريط تقدم، وشارة «مكتمل» لما تُغلق.
- زر «تعديل / إدارة» يظهر لمنشئ التدريب فقط.

---

## الجزء الثاني — رفع الأفاتار

نضبط تجربة الرفع في `AvatarUploader`:
- عرض **معاينة فورية** للصورة المختارة قبل انتهاء الرفع (blob URL).
- **حالة تحميل** واضحة (spinner + شريط تقدّم النسبة داخل الأفاتار).
- toast **نجاح** أخضر عند الحفظ، toast **فشل** أحمر يذكر السبب.
- التحقق من النوع (`image/*`) والحجم (≤ 5MB) قبل الرفع.
- زر الكاميرا يظل ظاهر باستمرار (كنا صلحنا مشكلة القص في الغلاف).

---

## تفاصيل تقنية (Technical)

### تعديل جدول `trainings`
- إسقاط قيود INSERT/UPDATE/DELETE الحصرية للأدمن، واستبدالها بسياسات `created_by`.
- إضافة أعمدة: `application_mode text` (`external` | `internal` — افتراضي `external`)، `max_applicants int NULL`، `applications_count int NOT NULL DEFAULT 0`، `is_full boolean GENERATED ALWAYS AS ...` (أو نستخدم الفلاق مباشرة).
- تخفيف قيد `apply_url NOT NULL` → nullable (لأنه اختياري في وضع النموذج الداخلي)، مع CHECK: (`application_mode='external' AND apply_url IS NOT NULL`) OR `application_mode='internal'`.

### جداول جديدة
```
training_form_fields (
  id uuid PK,
  training_id uuid FK → trainings ON DELETE CASCADE,
  field_key text,             -- سلاج فريد داخل التدريب
  label text, label_ar text,
  field_type text CHECK IN ('short_text','long_text','number','email','phone','select','checkbox','file'),
  required boolean DEFAULT false,
  options jsonb,              -- لخيارات select
  order_index int,
  created_at timestamptz
)
UNIQUE(training_id, field_key)

training_applications (
  id uuid PK,
  training_id uuid FK → trainings ON DELETE CASCADE,
  applicant_id uuid NOT NULL,     -- auth.users.id
  answers jsonb NOT NULL,         -- { field_key: value }
  status text DEFAULT 'submitted', -- submitted | reviewed | accepted | rejected
  created_at timestamptz,
  UNIQUE(training_id, applicant_id)
)
```

### Triggers
- `trg_training_apps_bump`: بعد INSERT على `training_applications` يزيد `applications_count`، ولو وصل `max_applicants` يخلي `is_active=false`.
- `trg_training_apps_notify`: إشعار لمنشئ التدريب بكل رد جديد.

### واجهات جديدة
- `src/pages/shared/TrainingCreate.tsx` (معالج الإنشاء + Field builder).
- `src/pages/shared/TrainingDetail.tsx` (عرض + تقديم).
- `src/pages/shared/TrainingManage.tsx` (لوحة المنشئ + جدول الردود + تصدير CSV).
- تحديث `Trainings.tsx` لعرض السعة والحالة وزر الإضافة.
- تحديث `AvatarUploader.tsx` بمعاينة فورية وحالة تحميل نظيفة.

### الاعتبارات
- ملفات المرفقات في نوع الحقل `file` تُرفع لباكت `message-attachments` باسم `training-<id>/<applicant>/<field_key>`.
- التحقق من صحة النموذج بـ zod client-side قبل الإرسال.
- إخفاء زر «إدارة» لأي مستخدم مش المنشئ/الأدمن.
- الأدمن يفضل يقدر يعمل كل شيء زي ما كان.
