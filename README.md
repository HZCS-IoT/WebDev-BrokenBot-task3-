# التاسك الثالث — إصلاح المساعد الصوتي (WebDev BrokenBot)


## وصف المشروع

تطبيق ويب **مساعد صوتي** باللغة العربية يتيح للمستخدم:

1. التحدث عبر الميكروفون (Speech-to-Text)
2. إرسال النص إلى خادم PHP
3. استلام رد من نموذج ذكاء اصطناعي (Cohere API)
4. سماع الرد بصوت (Text-to-Speech)

---

## هيكلة الملفات

```
├── index.html    ← الواجهة الرئيسية
├── style.css     ← التنسيق
├── app.js        ← منطق الصوت والاتصال بالخادم
├── bot.php       ← الخادم الخلفي (يستدعي Cohere API)
├── config.php    ← مفتاح API (محمي)
├── .htaccess     ← يمنع الوصول المباشر لـ config.php
├── BrokenBot-fixed.mp4 ← فيديو يثبت أن التطبيق يعمل
└── README.md     ← هذا الملف
```

---

## خطوات العمل المنفذة

### 1) رفع الملفات على السيرفر

- تم استخدام استضافة **InfinityFree** (مجانية وتدعم PHP).
- رُفعت جميع الملفات داخل مجلد **`htdocs`** على File Manager.
- تم وضع الملفات **في نفس المستوى** (بدون مجلدات فرعية):
  - `index.html`, `app.js`, `style.css`, `bot.php`, `config.php`, `.htaccess`
  
### 2) إعداد مفتاح API

1. إنشاء حساب في [Cohere Dashboard](https://dashboard.cohere.com/)
2. نسخ **Trial API Key** (مجاني: 1000 طلب/شهر)
3. لصق المفتاح في `config.php`:

```php
define('COHERE_API_KEY', 'YOUR_KEY_HERE');
```

> **ملاحظة:** لا ترفع المفتاح الحقيقي إلى GitHub. يبقى `ضع_مفتاحك_هنا` في المستودع.

### 3) اختبار التطبيق

- فحص الخادم: `https://hashem.free.je/bot.php?check=1` → `{"ok":true}`
- فحص الرد: `https://hashem.free.je/bot.php?prompt=مرحبا`
- فتح الواجهة: [https://hashem.free.je](https://hashem.free.je) → الميكروفون → التحدث → استلام رد صوتي

### 4) فيديو إثبات التشغيل

تم تسجيل فيديو يوضّح أن التطبيق يعمل بعد الإصلاح:

**[BrokenBot-fixed.mp4](./BrokenBot-fixed.mp4)** [▶ مشاهدة / تحميل فيديو العرض على GitHub](https://github.com/HZCS-IoT/WebDev-BrokenBot-task3-/blob/main/BrokenBot-fixed.mp4)


الفيديو يعرض:
- فتح الموقع على [hashem.free.je](https://hashem.free.je)
- التحدث عبر الميكروفون
- استلام رد من البوت وسماعه

---

## المشاكل التي وُجدت وكيف تم حلها

### المشكلة 1: خطأ 404 — الملف غير موجود

**الأعراض:**  
رسالة *"حدث خطأ أثناء الاتصال بالخادم"* وفي Console: `404` و `Failed to load resource`.

**السبب:**
- ملف `app.js` الأصلي كان يطلب `api/chat.php`
- الملف غير موجود في المسار المطلوب على السيرفر
- **InfinityFree تحظر كلمة `chat`** في أي رابط (مثل `chat.php`) → 404/403

**الحل:**
- إنشاء ملف خادم باسم **`bot.php`** (بدون كلمة chat)
- تحديث `app.js` ليتصل بـ `bot.php` بدل `api/chat.php`

---

### المشكلة 2: خطأ 403 — رفض الطلب

**الأعراض:**  
`فشل الطلب (403)` عند إرسال الرسالة.

**السبب:**  
InfinityFree ترفض طلبات **POST + JSON** من JavaScript (نظام أمان الاستضافة).

**الحل:**
- تغيير طريقة الإرسال في `app.js` من `POST` إلى **`GET`**:
  - `bot.php?prompt=النص`
- إضافة `credentials: "include"` لتمرير cookies الأمان

---

### المشكلة 3: خطأ في مسار `config.php` داخل PHP

**الأعراض:**  
فشل تحميل الإعدادات أو خطأ 500.

**السبب:**  
في النسخة الأصلية كان المسار:

```php
require __DIR__ . '/../config.php';
```

بينما `config.php` في **نفس المجلد** وليس المجلد الأعلى.

**الحل:**

```php
require __DIR__ . '/config.php';
```

---

### المشكلة 4: رفض Gemini API (Quota)

**الأعراض:**  
`رفض Gemini API الطلب` أو `حصة Gemini منتهية`.

**السبب:**
- مشروع Google AI Studio بدون حصة مجانية (`limit: 0`)
- إنشاء مفتاح جديد **بنفس المشروع** لا يغيّر الحصة

**الحل:**
- الانتقال إلى **Cohere API** (مجاني للتجربة، بدون بطاقة)
- تعديل `bot.php` لاستخدام endpoint:
  - `https://api.cohere.com/v2/chat`
  - Model: `command-r7b-12-2024`

---

### المشكلة 5: كاش المتصفح (Cache)

**الأعراض:**  
الموقع يعمل على السيرفر لكن المتصفح يظهر أخطاء قديمة (`askGemini`, `api/chat.php`).

**الحل:**
- تحديث قوي: **Ctrl + Shift + R**
- إضافة `?v=cohere2` لملف `app.js` في `index.html` لكسر الكاش

---

## ملخص التعديلات على ملف PHP (`bot.php`)

| قبل (معطّل) | بعد (يعمل) |
|-------------|------------|
| `require '../config.php'` | `require __DIR__ . '/config.php'` |
| `chat.php` (محظور) | `bot.php` |
| Gemini API | Cohere API |
| POST + JSON من المتصفح | GET + `?prompt=` |

**وظيفة `bot.php`:**
1. يستقبل النص من `app.js`
2. يقرأ مفتاح API من `config.php` بأمان
3. يرسل الطلب إلى Cohere
4. يرجع الرد بصيغة JSON: `{"reply": "..."}`

---

## طريقة التشغيل محليًا (اختياري)

1. تثبيت **XAMPP** أو **Laragon**
2. نسخ الملفات إلى `htdocs`
3. وضع مفتاح Cohere في `config.php`
4. فتح: `http://localhost/index.html`
5. استخدام **Chrome** أو **Edge** (لدعم الميكروفون)

---


## الطالب

**Hashem** — HZCS-IoT Web Development
