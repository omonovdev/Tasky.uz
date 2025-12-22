# Google OAuth Sozlash Bo'yicha Qo'llanma / Google OAuth Setup Guide

## Muammo / Problem
Google orqali kirish (Sign in with Google) ishlamayapti, chunki `.env` faylida Google OAuth credentials to'g'ri sozlanmagan.

---

## Yechim / Solution

### 1. Google Cloud Console'da Loyiha Yaratish
**Uzbek:**
1. [Google Cloud Console](https://console.cloud.google.com/)ga kiring
2. Yangi loyiha yarating yoki mavjud loyihani tanlang
3. **APIs & Services** > **Credentials** bo'limiga o'ting

**English:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**

---

### 2. OAuth 2.0 Client ID Yaratish
**Uzbek:**
1. **"Create Credentials"** tugmasini bosing
2. **"OAuth client ID"** ni tanlang
3. Application type sifatida **"Web application"** ni tanlang
4. Nomini kiriting: `Tasky App`
5. **Authorized redirect URIs** qo'shing:
   - Development uchun: `http://localhost:4010/api/auth/google/callback`
   - Production uchun: `https://your-domain.com/api/auth/google/callback`
6. **Create** tugmasini bosing

**English:**
1. Click **"Create Credentials"**
2. Select **"OAuth client ID"**
3. Choose **"Web application"** as application type
4. Enter name: `Tasky App`
5. Add **Authorized redirect URIs**:
   - For development: `http://localhost:4010/api/auth/google/callback`
   - For production: `https://your-domain.com/api/auth/google/callback`
6. Click **Create**

---

### 3. Credentials'ni Olish
**Uzbek:**
- Yaratilgandan so'ng, sizga **Client ID** va **Client Secret** ko'rsatiladi
- Bu ma'lumotlarni xavfsiz joyda saqlang!

**English:**
- After creation, you'll see the **Client ID** and **Client Secret**
- Save these credentials securely!

---

### 4. `.env` Faylini Yangilash

**Joriy muammo:**
```env
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

**To'g'ri sozlash:**
```env
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcd1234_EXAMPLE_secretKey
GOOGLE_CALLBACK_URL=http://localhost:4010/api/auth/google/callback
FRONTEND_URL=http://localhost:8080
```

---

### 5. Serverni Qayta Ishga Tushirish
**Uzbek:**
```bash
cd Tasky/api
npm run start:dev
```

**English:**
```bash
cd Tasky/api
npm run start:dev
```

---

## Xavfsizlik Eslatmasi / Security Warning

⚠️ **MUHIM / IMPORTANT:**
- Hech qachon `.env` faylini Git'ga commit qilmang!
- `GOOGLE_CLIENT_SECRET` ni hech kimga bermang!
- Production muhitida HTTPS ishlating!

⚠️ **CRITICAL:**
- Never commit `.env` file to Git!
- Keep `GOOGLE_CLIENT_SECRET` private!
- Use HTTPS in production!

---

## Tekshirish / Testing

1. Frontend'ni ishga tushiring:
   ```bash
   cd Tasky
   npm run dev
   ```

2. Brauzerda `/auth` sahifasiga o'ting

3. "Sign in with Google" tugmasini bosing

4. Google akkauntingizni tanlang va ruxsat bering

5. Muvaffaqiyatli kirganingizdan keyin dashboard'ga yo'naltirilasiz

---

## Keng Tarqalgan Xatolar / Common Errors

### Error: `redirect_uri_mismatch`
**Sabab:** Google Console'dagi redirect URI `.env` fayli bilan mos kelmayapti

**Yechim:**
- Google Console'da redirect URI to'g'ri yozilganligini tekshiring
- `.env` faylidagi `GOOGLE_CALLBACK_URL` qiymatini tekshiring

### Error: `invalid_client`
**Sabab:** Client ID yoki Client Secret noto'g'ri

**Yechim:**
- Google Console'dan credentials'ni qayta ko'chirib oling
- `.env` faylida probel yoki qo'shimcha belgilar yo'qligini tekshiring

---

## Qo'shimcha Sozlamalar / Additional Configuration

### OAuth Consent Screen (Rozilik Ekrani)
1. **APIs & Services** > **OAuth consent screen**
2. User Type: **External** (test uchun)
3. App name: `Tasky`
4. User support email: `your-email@gmail.com`
5. Developer contact: `your-email@gmail.com`
6. **Scopes** qo'shing:
   - `userinfo.email`
   - `userinfo.profile`

---

Bu sozlamalardan keyin Google OAuth to'liq ishlashi kerak!
After these configurations, Google OAuth should work perfectly!
