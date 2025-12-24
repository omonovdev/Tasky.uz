# Gmail SMTP Setup Guide

## Muammo
Gmail orqali email yuborilmayapti. Sabab: Gmail 2-step verification va App Password kerak.

## Hal qilish yo'llari

### Variant 1: Console dan kod olish (DEVELOPMENT - Tavsiya etiladi)
Backend terminalda kod ko'rinadi! Faqat:
1. Backend serverni ishga tushiring: `npm run start:dev`
2. Frontend da password reset qiling
3. **Backend terminalda** kod chiqadi:
```
========================================
🔑 PASSWORD RESET CODE GENERATED
========================================
Email: user@example.com
Code: 123456
Expires: ...
========================================
```
4. Bu kodni frontendga kiriting

### Variant 2: Gmail App Password sozlash (PRODUCTION)

#### 📱 To'g'ridan-to'g'ri URL:
**App Password yaratish:** https://myaccount.google.com/apppasswords

#### Qadamlar:

1. **2-Step Verification yoqish (agar yoqilmagan bo'lsa):**
   - https://myaccount.google.com/signinoptions/two-step-verification
   - "GET STARTED" bosing va telefon raqamingizni tasdiqlang

2. **App Password yaratish:**
   - https://myaccount.google.com/apppasswords ga o'ting
   - **Select app** -> **Other (Custom name)** tanlang
   - "Tasky" yoki "Tasky Backend" deb nomlang
   - **Generate** bosing
   - **16 ta belgilik parol** chiqadi (masalan: `abcd efgh ijkl mnop`)
   - ⚠️ Bu parolni ko'chirib oling, bir marta ko'rsatiladi!

#### 4. .env faylga kiriting
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourmail@gmail.com
SMTP_PASS=abcd efgh ijkl mnop  # App password (boʻshliqlar bilan yoki bo'shliqsiz)
```

**MUHIM:** Oddiy Gmail parolingizni EMAS, App Password ni ishlating!

### Variant 3: Mailtrap.io (DEVELOPMENT - Eng yaxshi)

Development uchun [Mailtrap.io](https://mailtrap.io) ishlatish tavsiya etiladi:

1. [mailtrap.io](https://mailtrap.io) da ro'yxatdan o'ting (bepul)
2. Inbox yarating
3. SMTP credentials ni oling
4. `.env` faylga qo'ying:
```bash
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_username
SMTP_PASS=your_mailtrap_password
```

Mailtrap afzalliklari:
- ✅ Haqiqiy emailga yuborilmaydi (test muhiti)
- ✅ Barcha emaillarni ko'rish mumkin
- ✅ Spam bo'lmaydi
- ✅ Tezkor sozlash

## Xatoliklar va yechimlar

### "535-5.7.8 Username and Password not accepted"
❌ **Muammo:** Oddiy Gmail parol ishlatilmoqda
✅ **Yechim:** App Password ishlating yoki Console dan kod oling

### Email yuborilmayapti, lekin xato yo'q
❌ **Muammo:** SMTP sozlamalar noto'g'ri
✅ **Yechim:** Backend terminalda kod chiqadi, undan foydalaning

### Kod kelmayapti
✅ **Yechim:** Backend terminalga qarang, kod u yerda!

## Development vs Production

**Development (localhost):**
- Variant 1: Console dan kod olish ✅ **Tavsiya**
- Variant 3: Mailtrap ishlatish ✅ **Eng yaxshi**

**Production (tasky.uz):**
- Variant 2: Gmail App Password ✅
- Yoki professional SMTP service (SendGrid, AWS SES)

## Hozirgi holat

Hozir kod **backend terminalda** chiqadi! Email yuborilmasa ham ishlayd, faqat terminal log ni ko'ring.
