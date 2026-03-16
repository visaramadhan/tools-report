# Tools Report System

Sistem pelaporan kondisi tools untuk teknisi.

## Fitur
- **Admin Dashboard**: Statistik, Manajemen Tools, User, Report, Settings.
- **Technician**: Dashboard, Buat Report (Upload Foto), History.
- **Export**: PDF, Excel.
- **Notifikasi**: Email jika kondisi BAD.

## Cara Menjalankan

1. Clone repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Buat file `.env.local`:
   ```env
   MONGODB_URI=mongodb://localhost:27017/tools-report
   AUTH_SECRET=rahasia_super_aman
   NEXTAUTH_URL=http://localhost:3000
   
   # Konfigurasi Email (Opsional)
   EMAIL_HOST=smtp.ethereal.email
   EMAIL_PORT=587
   EMAIL_USER=user
   EMAIL_PASS=pass
   ```
4. Jalankan seed untuk membuat user admin:
   - Jalankan server: `npm run dev`
   - Buka browser: `http://localhost:3000/api/seed`
   - Anda akan melihat pesan "Admin created" atau "Admin already exists".
5. Login:
   - Email: `admin@example.com`
   - Password: `admin123`

## Teknologi
- Next.js 14 (App Router)
- MongoDB + Mongoose
- NextAuth.js (Auth.js)
- Tailwind CSS + Shadcn UI (Concepts)
- Recharts (Chart)
- jsPDF & SheetJS (Export)
