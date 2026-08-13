
# خطة تنفيذ ضخمة — 3 محاور متوازية

الطلب كبير جدًا. سأقسّمه إلى 3 محاور رئيسية، وسأنفّذها بالترتيب في نفس الجولة بعد موافقتك.

---

## المحور الأول — المرحلة 3: Design System شامل

**الهدف:** رفع مستوى الشكل البصري لكل الصفحات القائمة.

1. **`src/index.css`** — طبقة gradients، shadow tokens (`--shadow-glass`, `--shadow-glow`, `--shadow-float`)، دعم dark أفضل، radii أنعم.
2. **مكوّنات مساعدة جديدة:**
   - `src/components/ui/glass-card.tsx` — بطاقة زجاجية بحواف مدوّرة و blur.
   - `src/components/ui/section-heading.tsx` — عناوين موحّدة.
   - `src/components/ui/animated-tabs.tsx` — Tabs بمؤشر متحرّك (Framer).
3. **Motion موحّد:** استخدام `AnimatePresence` في الحوارات، `motion.div` على الكروت الرئيسية بـ `staggerChildren` لظهور متتابع.
4. **تطبيق أولي على:** `Community.tsx`, `Profile.tsx`, `Trainings.tsx`, `StudentDashboard.tsx`, `DoctorDashboard.tsx` (لن نلمس المنطق — فقط الغلاف البصري).

---

## المحور الثاني — نظام Quizzes الكامل

**قاعدة البيانات (migration واحدة):**

| جدول | الغرض |
|---|---|
| `quizzes` | id, created_by, subject_id, department_id, group_name, title, description, duration_seconds, total_points, starts_at, ends_at, shuffle_questions, shuffle_options, show_correct_after, allow_review, is_published, is_active, max_attempts |
| `quiz_questions` | id, quiz_id, order_index, question_type (`true_false` \| `single_choice` \| `multiple_choice`), question_text, points, explanation, media_url |
| `quiz_options` | id, question_id, order_index, option_text, is_correct |
| `quiz_attempts` | id, quiz_id, student_id, started_at, submitted_at, time_taken_seconds, score, total_points, percentage, status (`in_progress`\|`submitted`\|`auto_submitted`\|`abandoned`) |
| `quiz_answers` | id, attempt_id, question_id, selected_option_ids[], is_correct, points_earned, answered_at |

- Triggers: احتساب الدرجة تلقائيًا عند submit، تحديث `total_points` في `quizzes` عند تعديل الأسئلة، `updated_at`.
- RPC: `submit_quiz_attempt(p_attempt_id)` — يحسب النتيجة ويقفل المحاولة.
- RPC: `start_quiz_attempt(p_quiz_id)` — يتحقق من الصلاحية (طالب، قسم، مادة، لم يتجاوز `max_attempts`، ضمن الوقت).
- RLS:
  - الطلاب: يقرؤون فقط الكويزات المنشورة الخاصة بقسمهم/مادتهم/فرقتهم، ويرون فقط محاولاتهم وإجاباتهم.
  - الدكتور/المعيد: CRUD كامل على كويزاته + قراءة كل محاولات كويزاته وإجاباتها (بدون الكشف عن إجابات صحيحة قبل `show_correct_after`).
  - Grants: `authenticated` (بدون anon).
- Storage: إعادة استخدام bucket موجود للصور (إن لزم).

**واجهة الدكتور/المعيد:**
- `src/pages/doctor/QuizList.tsx` — قائمة كويزاتي مع إحصائيات (منشور، عدد المحاولات، متوسط الدرجات).
- `src/pages/doctor/QuizBuilder.tsx` — Wizard 3 خطوات:
  1. المعلومات الأساسية (عنوان، مادة، فرقة، مدة، تواريخ).
  2. الأسئلة (drag-to-reorder، أنواع الأسئلة الثلاثة بواجهات مختلفة، معاينة).
  3. الإعدادات (خلط، عرض الإجابات، عدد المحاولات) → نشر.
- `src/pages/doctor/QuizResults.tsx` — جدول المحاولات: الطالب، الوقت المستغرق، الدرجة، النسبة، وقت التسليم، تصدير CSV، فلترة، بحث، رسم بياني للتوزيع.
- `src/pages/doctor/QuizAttemptDetail.tsx` — تفصيل إجابات طالب واحد.

**واجهة الطالب:**
- `src/pages/student/StudentQuizzes.tsx` — كويزات متاحة/سابقة، شارة "جديد"، عدّاد تنازلي حتى بدء الكويز.
- `src/pages/student/QuizTake.tsx` — شاشة الحل:
  - Timer دائري في الأعلى (auto-submit عند انتهاء الوقت).
  - سؤال بسؤال أو الكل في صفحة (خيار).
  - حفظ تلقائي للإجابات محليًا كل 5 ثواني (لتجنّب الضياع عند crash).
  - منع الخروج بدون تأكيد.
- `src/pages/student/QuizResult.tsx` — النتيجة، نسبة النجاح، الأسئلة الصحيحة/الخاطئة (لو `show_correct_after` مفعّل).

**Edge Function (اختيارية لكن مفيدة):**
- `quiz-auto-submit` — cron كل دقيقة يتحقق من محاولات مضى وقتها وأتمتة submit.

**نقاط:** إضافة نقاط تلقائية عند اجتياز الكويز بنسبة معيّنة (يُخصَّص في إعدادات الكويز).

---

## المحور الثالث — تحسينات Stories

1. **تتبع المشاهدات:** تفعيل `story_views` INSERT عند الفتح بشكل موثوق + شاشة "المشاهدون" لصاحب القصة.
2. **قص الفيديو:** استخدام `ffmpeg.wasm` أو رفض الفيديو الأطول من 60 ثانية مع toast واضح (سأبدأ بالرفض + مؤشر مدة قبل الرفع).
3. **رفع محسّن:** progress bar، معاينة قبل الرفع، ضغط الصور (canvas → webp) للتحميل الأسرع.
4. **تصميم أفضل:** حلقات gradient دوّارة للقصص غير المشاهَدة، انتقالات ناعمة في `StoryViewer`, dots للتقدّم بين قصص نفس المستخدم.

---

## الحجم والتنفيذ

- **الملفات الجديدة المتوقّعة:** ~15 صفحة/مكوّن + 1 migration ضخمة + 1 edge function.
- **الملفات المعدّلة:** ~10 (App.tsx للـ routes، navigation، dashboards).
- **الوقت التقديري:** جولتان — الأولى: DB + backend + شاشات الدكتور + المرحلة 3. الثانية: شاشات الطالب + Stories + QA.

**سأبدأ بالـ migration فورًا بعد موافقتك، ثم أنتقل للكود على التوازي.**

هل أبدأ؟
