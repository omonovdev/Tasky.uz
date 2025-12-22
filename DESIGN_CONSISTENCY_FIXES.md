# Dizayn Konsistensiyasini Tuzatish / Design Consistency Fixes

## Muammo / Problem

Loyihada dizayn konsistensiyasi buzilgan. Ba'zi komponentlar hard-coded ranglardan foydalanmoqda (masalan: `text-blue-500`, `bg-green-400`) design token'lar (`primary`, `secondary`, `success`, etc.) o'rniga.

**Translation:** The project has design consistency issues. Some components use hard-coded colors (e.g., `text-blue-500`, `bg-green-400`) instead of design tokens (`primary`, `secondary`, `success`, etc.).

---

## Mavjud Dizayn Tizimi / Existing Design System

Loyihada to'g'ri dizayn tizimi mavjud (`src/index.css` va `tailwind.config.ts`):

### Design Tokens (Rang Tizimlari):
```css
--primary: 221 83% 53%;           /* Asosiy ko'k rang */
--secondary: 214 95% 69%;         /* Ikkilamchi och ko'k */
--success: 142 71% 45%;           /* Muvaffaqiyat uchun yashil */
--warning: 45 93% 47%;            /* Ogohlantirish uchun sariq */
--urgent: 43 96% 56%;             /* Shoshilinch uchun sariq */
--destructive: 0 84% 60%;         /* O'chirish/xato uchun qizil */
--muted: 220 14% 96%;             /* Kam ahamiyatli matnlar */
--accent: 221 83% 53%;            /* Aksent rang */
```

---

## Muammoli Fayllar / Files with Issues

Hard-coded ranglar ishlatilayotgan fayllar:
```
- src/components/EstimatedTimeDialog.tsx
- src/components/ui/badge.tsx
- src/pages/Team.tsx
- src/pages/Dashboard.tsx
- src/pages/TaskDetail.tsx
- src/components/CreateTaskForm.tsx
- And many more...
```

---

## Yechim / Solution

### ❌ Noto'g'ri (Hard-coded colors):
```tsx
<div className="text-blue-500 bg-green-400">
  <Badge className="bg-purple-600 text-white">Status</Badge>
</div>
```

### ✅ To'g'ri (Design tokens):
```tsx
<div className="text-primary bg-success">
  <Badge variant="default">Status</Badge>
</div>
```

---

## Qo'llanmalar / Guidelines

### 1. Ranglar uchun Faqat Design Token'lardan Foydalaning

| Hard-coded Color | Design Token | Qachon Ishlatish / When to Use |
|------------------|--------------|--------------------------------|
| `text-blue-500`, `bg-blue-600` | `text-primary`, `bg-primary` | Asosiy aksiyalar, tugmalar, linklar |
| `text-green-500`, `bg-green-400` | `text-success`, `bg-success` | Muvaffaqiyatli statuslar, tugallangan vazifalar |
| `text-red-500`, `bg-red-600` | `text-destructive`, `bg-destructive` | Xatolar, o'chirish, bekor qilish |
| `text-yellow-500`, `bg-yellow-400` | `text-warning`, `bg-warning` | Ogohlantirishlar, pending statuslar |
| `text-purple-500` | `text-secondary` | Ikkilamchi elementlar |
| `text-gray-400` | `text-muted-foreground` | Yordam matnlari, metama'lumotlar |

### 2. Badge Component

**EstimatedTimeDialog.tsx** da badge variant'laridan foydalaning:

❌ **Noto'g'ri:**
```tsx
<Badge className="bg-purple-600 text-white">New</Badge>
<Badge className="bg-green-500 text-white">Completed</Badge>
```

✅ **To'g'ri:**
```tsx
<Badge variant="default">New</Badge>
<Badge variant="success">Completed</Badge>
<Badge variant="destructive">Urgent</Badge>
<Badge variant="secondary">In Progress</Badge>
```

### 3. Status Ranglari

Task va organizatsiya statuslari uchun:

```tsx
// ❌ Noto'g'ri
const getStatusColor = (status: string) => {
  if (status === 'completed') return 'bg-green-500';
  if (status === 'in_progress') return 'bg-blue-500';
  if (status === 'urgent') return 'bg-red-500';
};

// ✅ To'g'ri
const getStatusColor = (status: string) => {
  if (status === 'completed') return 'bg-success';
  if (status === 'in_progress') return 'bg-primary';
  if (status === 'urgent') return 'bg-destructive';
};
```

### 4. Gradient'lar

❌ **Noto'g'ri:**
```tsx
<div className="bg-gradient-to-r from-blue-500 to-purple-600">
```

✅ **To'g'ri:**
```tsx
<div className="bg-gradient-to-r from-primary to-secondary">
```

### 5. Hover States

❌ **Noto'g'ri:**
```tsx
<button className="hover:bg-blue-100 hover:text-blue-700">
```

✅ **To'g'ri:**
```tsx
<button className="hover:bg-primary/10 hover:text-primary">
```

---

## Tezkor Tuzatish Rejasi / Quick Fix Plan

### 1. Badge Component'ni Yangilash
`src/components/ui/badge.tsx` fayliga variant'lar qo'shing:

```tsx
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        success: "bg-success text-success-foreground",
        warning: "bg-warning text-warning-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border border-input bg-background",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);
```

### 2. Barcha Hard-coded Ranglarni Almashtiring

Quyidagi komandani ishlating (VS Code da):
```
Find:    (text|bg|border)-(blue|green|red|purple|yellow|orange)-(50|100|200|300|400|500|600|700|800|900)
Replace: [mos design token]
```

Yoki qo'lda har bir faylni ko'rib chiqing va almashtiring.

### 3. Dark Mode'ni Tekshiring

Design token'lar ishlatilsa, dark mode avtomatik ishlaydi. Hard-coded ranglar dark mode'da buziladi.

---

## Afzalliklari / Benefits

✅ **Konsistent dizayn** - Butun loyihada bir xil ranglar
✅ **Dark mode support** - Design token'lar dark mode uchun avtomatik o'zgaradi
✅ **Oson o'zgartirish** - Faqat CSS variable'larni o'zgartiring, butun loyiha yangilanadi
✅ **Professional ko'rinish** - Dizayner kontseptsiyasiga mos keladi
✅ **Accessibility** - To'g'ri kontrast nisbatlari

---

## Misol: EstimatedTimeDialog.tsx Tuzatish

### Avvalgi (Hard-coded):
```tsx
<div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
  <Clock className="h-6 w-6 text-white" />
  <span className="bg-gradient-to-r from-blue-600 to-purple-600">
    Estimate Time
  </span>
</div>
```

### Tuzatilgan (Design tokens):
```tsx
<div className="bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
  <Clock className="h-6 w-6 text-primary-foreground" />
  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
    Estimate Time
  </span>
</div>
```

---

## Keyingi Qadamlar / Next Steps

1. ✅ **Badge component'ni yangilang** - Variant'lar qo'shing
2. ✅ **EstimatedTimeDialog.tsx'ni tuzating** - Hard-coded ranglarni olib tashlang
3. ✅ **Barcha .tsx fayllarni tekshiring** - Hard-coded ranglarni toping
4. ✅ **Replace qiling** - Design token'lar bilan almashtiring
5. ✅ **Test qiling** - Light va Dark mode'da ishlashini tekshiring

---

Ushbu tuzatishlardan so'ng dizayn konsistensiyasi to'liq tiklanadi!
After these fixes, design consistency will be fully restored!
