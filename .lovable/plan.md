# خطة التنفيذ الشاملة

## 1) صور أفاتار عشوائية تلقائيًا (بدون اختيار يدوي)

- توسيع مكتبة الأفاتار من 20 إلى **40 صورة متنوعة** (أشكال، ألوان، أنماط مختلفة تمامًا — لا تكرار).
- عند التسجيل: يتم تعيين واحدة **عشوائيًا** تلقائيًا لكل مستخدم جديد (trigger على `profiles`).
- لكل مستخدم حالي بدون `avatar_url`: يتم تعيين واحدة عشوائيًا لمرة واحدة.
- يقدر المستخدم يرفع صورته الشخصية لاحقًا لو حب — بس مش شرط.
- الأفاتار الافتراضية تكون SVG/CDN URLs جاهزة (DiceBear notionists/adventurer style — 40 seed مختلفة).

## 2) صفحة الملتقى (Community)

- **إصلاح ظهور صورة اللوجو**: التأكد إن `avatar_url` في كل بطاقة post بيمر على `StorageImage` مع fallback صحيح، ومعالجة signed URLs بالكاش.
- **تسريع تحميل المنشورات**: 
  - إضافة `skeleton loader` أثناء التحميل.
  - جلب صور الأفاتار عبر `Promise.all` بدلاً من تسلسلي.
  - تقليل عدد الحقول المُختارة من `select('*')` إلى الأعمدة الضرورية.
  - كاش signed URLs لمدة ساعة في `sessionStorage`.

## 3) صفحة الـ Profile (بروفايل مستخدم آخر)

- التأكد إن أزرار **المراسلة** و**المتابعة** ظاهرة **دائمًا** في `PublicProfile.tsx` (موجودين بالفعل — تأكيد المسار الصحيح والـ routing).
- إضافة اختصار "زيارة البروفايل" من كل بطاقة منشور تفتح `/{role}/user/{userId}`.

## 4) لوحة الطالب في وضع الإجازة الصيفية

- إخفاء كل الكروت المتعلقة بالمحاضرات (اليوم/التالية/الحضور).
- إظهار بدلاً منها:
  - **بطاقات التدريبات** (المرتّبة بأقرب موعد).
  - **آخر المنشورات من الملتقى** (feed مصغّر).
  - **بطاقة إحصائيات الأداء التاريخي**: نسبة الحضور الكلية، إجمالي النقاط، ترتيب في اللوحة، عدد المنشورات والإعجابات.
  - **اقتراحات للتطوير**: كورسات/مقالات (روابط ثابتة).

## 5) نظام الأدوار: إضافة المعيد (TA) والإداري (Admin عبر دعوة)

### أ) المعيد (Teaching Assistant)
- إضافة قيمة `teaching_assistant` لـ enum `app_role` (أو استخدام حقل `role` في profiles).
- **نفس صلاحيات الدكتور بالكامل**: محاضرات، حضور، تحليلات، إنذارات، ساعات مكتبية، تقييمات.
- تسجيل جديد: اختيار "طالب / دكتور / معيد" — والمعيد يستخدم نفس مفتاح `BSUT2024`.
- تحديث كل RLS policies اللي فيها `role='doctor'` لتشمل `role IN ('doctor','teaching_assistant')`.
- تحديث كل `MobileLayout` و`App.tsx` routes: مسار `/ta/*` يعيد استخدام صفحات الدكتور.

### ب) الإداري (Admin — بدعوة فقط)
- جدول جديد `admin_invites`: `id, token, email, invited_by, expires_at, used_at, created_at`.
- صفحة `/admin/invites` داخل AdminDashboard: زر "إنشاء رابط دعوة" → ينشئ token فريد → ينسخ الرابط `/invite/admin/{token}`.
- صفحة عامة `/invite/admin/{token}`:
  - تتحقق من صلاحية الـ token.
  - تطلب من المستخدم تسجيل حساب (email/password) أو تسجيل دخول.
  - عند النجاح: تُضيف صف في `user_roles` بدور `admin` + تعلّم الـ token كمستخدم.
- Edge function `redeem-admin-invite` (SECURITY DEFINER) للتحقق واستهلاك الدعوة.

## 6) التغييرات التقنية بالتفصيل

### قاعدة البيانات (migration واحدة):
```sql
-- 1. توسيع app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'teaching_assistant';

-- 2. جدول admin_invites + RLS + GRANT + trigger for expiry
CREATE TABLE public.admin_invites (...);

-- 3. Trigger على profiles: عند INSERT بدون avatar_url → assign random
CREATE FUNCTION public.assign_random_avatar() ...
CREATE TRIGGER on_profile_created_assign_avatar ...

-- 4. Backfill: للمستخدمين الحاليين بدون avatar
UPDATE profiles SET avatar_url = ... WHERE avatar_url IS NULL;

-- 5. تحديث RLS policies اللي بتقيّد على 'doctor' لتشمل 'teaching_assistant'
```

### ملفات جديدة:
- `src/lib/defaultAvatars.ts` — قائمة 40 URL.
- `src/pages/admin/AdminInvites.tsx` — إدارة دعوات الإداري.
- `src/pages/AdminInviteRedeem.tsx` — صفحة استهلاك الدعوة (عامة).
- `supabase/functions/redeem-admin-invite/index.ts` — edge function.

### ملفات معدّلة:
- `src/pages/Register.tsx` — إضافة خيار "معيد" + assign avatar عشوائي.
- `src/pages/student/StudentDashboard.tsx` — منطق الإجازة.
- `src/pages/shared/Community.tsx` — تسريع + إصلاح صور.
- `src/App.tsx` — routes للمعيد ودعوة الإداري.
- `src/contexts/AuthContext.tsx` — دعم role الجديد.
- `src/components/MobileLayout.tsx` — قوائم المعيد.

---

**بعد الموافقة** سأبدأ بالـ migration ثم الكود على التوازي.