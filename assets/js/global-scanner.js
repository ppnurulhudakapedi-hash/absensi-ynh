/**
 * Global Barcode Scanner Module
 * Menangkap input dari scanner barcode fisik di halaman manapun
 */

let globalBarcodeBuffer = '';
let globalBarcodeTimeout = null;
let globalIsScanning = true;
let globalOperator = null;
let globalTimeSettings = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Tunggu auth siap
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            await loadGlobalSettings(user.uid);
            initGlobalScanner();
        }
    });
});

async function loadGlobalSettings(uid) {
    try {
        const adminDoc = await db.collection('admins').doc(uid).get();
        if (adminDoc.exists) {
            globalOperator = adminDoc.data().nama;
        }

        const timeDoc = await db.collection('settings').doc('time').get();
        if (timeDoc.exists) {
            globalTimeSettings = timeDoc.data();
        } else {
            globalTimeSettings = {
                jamMasukStart: '06:00',
                jamMasukEnd: '07:30',
                jamPulangStart: '14:00',
                jamPulangEnd: '16:00'
            };
        }
    } catch (error) {
        console.error('Error loading global settings:', error);
    }
}

function initGlobalScanner() {
    document.addEventListener('keydown', (e) => {
        // Jangan tangkap jika user sedang mengetik di input field (kecuali input khusus scanner jika ada)
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            // Jika input manual di halaman scan-qr, kita biarkan saja
            if (e.target.id === 'manualNisn') return;
            // Jika user ngetik di search box dll, jangan dibajak.
            // Barcode scanner yg sangat cepat tetap akan mengisi input field tsb.
            // Namun, untuk menghindari bentrok, lebih baik kita abaikan saat fokus di input.
            return;
        }

        // Reset buffer jika jeda terlalu lama (> 100ms), karena manusia mengetik lebih lambat dari barcode scanner
        if (globalBarcodeTimeout) clearTimeout(globalBarcodeTimeout);
        globalBarcodeTimeout = setTimeout(() => {
            globalBarcodeBuffer = '';
        }, 100);

        // Jika menekan Enter, proses barcode
        if (e.key === 'Enter') {
            if (globalBarcodeBuffer.length >= 3) {
                e.preventDefault();
                processGlobalScan(globalBarcodeBuffer);
            }
            globalBarcodeBuffer = '';
        } 
        // Jika karakter tunggal yang bisa dicetak, tambahkan ke buffer
        else if (e.key.length === 1) {
            globalBarcodeBuffer += e.key;
        }
    });
}

async function processGlobalScan(decodedText) {
    if (!globalIsScanning || !globalTimeSettings || !globalOperator) return;
    
    globalIsScanning = false;
    
    try {
        const nisn = decodedText.trim();
        const now = new Date();
        const currentTimeStr = formatTime(now); // dari utils.js
        
        let jenisAbsensi = 'Harian';
        let statusWaktu = 'Hadir';
        
        const timeToMins = (tStr) => {
            if (!tStr) return 0;
            const parts = tStr.split(':');
            return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        };
        
        const currentMins = timeToMins(currentTimeStr);
        const masukStart = timeToMins(globalTimeSettings.jamMasukStart || '06:00');
        const masukEnd = timeToMins(globalTimeSettings.jamMasukEnd || '07:30');
        const pulangStart = timeToMins(globalTimeSettings.jamPulangStart || '14:00');
        const pulangEnd = timeToMins(globalTimeSettings.jamPulangEnd || '16:00');
        
        if (currentMins < pulangStart) {
            jenisAbsensi = 'Masuk';
            if (currentMins > masukEnd) {
                statusWaktu = 'Terlambat';
            } else {
                statusWaktu = 'Tepat Waktu';
            }
        } else {
            jenisAbsensi = 'Pulang';
            if (currentMins > pulangEnd) {
                statusWaktu = 'Terlambat';
            } else {
                statusWaktu = 'Tepat Waktu';
            }
        }
        
        console.log('=== GLOBAL SCAN DEBUG ===');
        console.log('NISN:', nisn, '| Jenis:', jenisAbsensi, '| Status:', statusWaktu);
        
        // Cek apakah siswa ada
        const studentSnapshot = await db.collection('students')
            .where('nisn', '==', nisn)
            .where('status', '==', 'Aktif')
            .get();
        
        if (studentSnapshot.empty) {
            Swal.fire({
                icon: 'error',
                title: 'Siswa Tidak Ditemukan',
                text: `NISN ${nisn} tidak terdaftar atau tidak aktif`,
                confirmButtonColor: '#EF4444',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
            setTimeout(() => { globalIsScanning = true; }, 1000);
            return;
        }
        
        const studentDoc = studentSnapshot.docs[0];
        const studentData = studentDoc.data();
        
        // Cek duplikat absensi hari ini
        const todayDate = getTodayDate();
        const duplicateCheck = await db.collection('attendance')
            .where('nisn', '==', nisn)
            .where('tanggal', '==', todayDate)
            .where('jenisAbsensi', '==', jenisAbsensi)
            .get();
        
        if (!duplicateCheck.empty) {
            Swal.fire({
                icon: 'warning',
                title: 'Sudah Absen',
                text: `${studentData.nama} sudah absensi ${jenisAbsensi} hari ini`,
                confirmButtonColor: '#F59E0B',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
            setTimeout(() => { globalIsScanning = true; }, 1000);
            return;
        }
        
        // Simpan absensi
        const attendanceData = {
            nisn: nisn,
            nama: studentData.nama,
            kelas: studentData.kelas,
            jenisAbsensi: jenisAbsensi,
            tanggal: todayDate,
            jam: currentTimeStr,
            statusWaktu: statusWaktu,
            operator: globalOperator,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('attendance').add(attendanceData);
        
        // Notifikasi Sukses via Toast agar tidak mengganggu layar
        Swal.fire({
            icon: 'success',
            title: `${studentData.nama} (${studentData.kelas})`,
            text: `Berhasil Absen ${jenisAbsensi} - ${statusWaktu}`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
        
        // Refresh tabel di halaman yang sedang aktif jika fungsi tersebut ada
        if (typeof loadRecentActivity === 'function') {
            loadRecentActivity(); // Dashboard
            if (typeof loadStatistics === 'function') loadStatistics();
        }
        if (typeof loadTodayHistory === 'function') {
            loadTodayHistory(); // Halaman Scan QR
        }
        
        setTimeout(() => { globalIsScanning = true; }, 1000);
        
    } catch (error) {
        console.error('Error processing global scan:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Gagal memproses absensi',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
        setTimeout(() => { globalIsScanning = true; }, 1000);
    }
}
