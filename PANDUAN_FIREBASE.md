# Panduan Setup Database Firebase (absensi-nh)

Karena Anda baru saja membuat database Firebase baru dengan nama **absensi-nh**, Anda perlu menghubungkan website absensi ini ke database tersebut. Ikuti langkah-langkah di bawah ini dari awal:

## 1. Dapatkan Konfigurasi Firebase Anda
1. Buka [Firebase Console](https://console.firebase.google.com/) dan masuk ke proyek **absensi-nh**.
2. Klik ikon **Gear (Pengaturan)** di sebelah menu "Project Overview" (kiri atas), lalu pilih **Project settings**.
3. Gulir ke bawah ke bagian **Your apps**. Jika Anda belum membuat aplikasi web, klik ikon **`</>` (Web)** untuk menambahkan aplikasi web baru. Beri nama aplikasi (misal: "Absensi Web") dan klik **Register app**.
4. Setelah terdaftar, Anda akan melihat blok kode konfigurasi yang terlihat seperti ini:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyB-xxxxxxxxxxxxxxx",
     authDomain: "absensi-nh.firebaseapp.com",
     projectId: "absensi-nh",
     storageBucket: "absensi-nh.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef123456"
   };
   ```
5. **Salin (Copy)** seluruh bagian `firebaseConfig` tersebut.

## 2. Masukkan Konfigurasi ke Website
1. Buka folder proyek website absensi Anda (`d:\absensi-nh`).
2. Masuk ke folder `assets/js/` dan buka file **`firebase.js`**.
3. Ganti konfigurasi yang lama dengan konfigurasi yang baru saja Anda salin dari Firebase Console.
4. Simpan file tersebut. Sekarang website Anda sudah terhubung dengan database **absensi-nh**!

## 3. Aktifkan Layanan Firebase yang Dibutuhkan
Agar aplikasi berjalan normal, Anda wajib mengaktifkan 2 layanan ini di Firebase Console:

### A. Authentication (Untuk Login Admin)
1. Di menu sebelah kiri Firebase Console, klik **Build > Authentication**.
2. Klik **Get Started**.
3. Pilih tab **Sign-in method**, lalu pilih **Email/Password**.
4. Aktifkan (Enable) opsi **Email/Password**, lalu klik **Save**.
5. Pilih tab **Users** dan klik **Add user**. Buat akun admin untuk login ke website (misal email: `admin@nurulhuda.com` dan password: `password123`).

### B. Firestore Database (Untuk Simpan Data Absen & Siswa)
1. Di menu sebelah kiri, klik **Build > Firestore Database**.
2. Klik **Create database**.
3. Pilih lokasi server (disarankan lokasi terdekat seperti `asia-southeast2` Jakarta atau biarkan default), lalu klik **Next**.
4. Pilih **Start in test mode** untuk memudahkan testing awal, lalu klik **Enable**.

## 4. Tambahkan Admin ke Database
Agar Anda bisa login melewati sistem website:
1. Setelah Firestore Database berhasil dibuat, klik **Start collection**.
2. Isi **Collection ID** dengan `admins` lalu klik **Next**.
3. Pada **Document ID**, masukkan **UID** dari akun admin yang Anda buat di menu Authentication tadi (Anda bisa melihat UID ini di tab *Authentication > Users*).
4. Tambahkan Field berikut:
   - Field: `email` | Type: `string` | Value: `admin@nurulhuda.com`
   - Field: `nama` | Type: `string` | Value: `Admin Utama`
   - Field: `role` | Type: `string` | Value: `admin`
5. Klik **Save**.

---
**Selesai!** Sekarang Anda bisa membuka `index.html` di browser dan mencoba login menggunakan email dan password yang telah Anda buat. Sistem absensi sudah siap digunakan.
