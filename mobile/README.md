# Tools Report Mobile (Expo)

## Jalankan

1. Jalankan backend (Next.js) di port 3001:

```bash
npm run dev
```

2. Jalankan mobile app:

```bash
cd mobile
npm run start
```

## Build Android (APK untuk install)

Gunakan EAS Build supaya dapat file APK yang bisa langsung di-install di Android.

1. Pastikan sudah punya akun Expo, lalu login:

```bash
npx eas-cli@latest login
```

2. Set API URL:
   - Kalau pakai Vercel (online): `https://tools-report.vercel.app`
   - Kalau pakai laptop (LAN): `http://192.168.1.10:3001`
   - Set di [eas.json](file:///C:/Users/Visa%20Ramadhan/Documents/project/tools-report/mobile/eas.json) bagian `build.preview.env.EXPO_PUBLIC_API_URL`

3. (Opsional) Jalankan backend lokal agar bisa diakses dari HP (LAN):

```bash
npm run dev
```

Pastikan:
- Laptop dan HP satu WiFi
- Windows Firewall mengizinkan port 3001

4. Jalankan build APK:

```bash
cd mobile
npm run build:android:apk
```

Hasil build akan berupa link download APK dari EAS. Download dan install di Android.

## Build Android (AAB untuk Play Store)

```bash
cd mobile
npm run build:android:aab
```

## Konfigurasi API URL

- Default:
  - Android Emulator: `http://10.0.2.2:3001`
  - iOS Simulator / Web: `http://localhost:3001`
- Override dengan env:

```bash
set EXPO_PUBLIC_API_URL=http://192.168.1.10:3001
```

## Fitur (Technician)

- Login
- Tools Saya (hanya tools yang sedang dipinjam)
- Buat Report (Good/Bad, foto wajib jika Bad)
- Riwayat Report
- Penukaran Alat: Terima Tools & Kirim Tools Lama
