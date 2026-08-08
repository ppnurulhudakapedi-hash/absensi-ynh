/**
 * QR Scanner Module
 * Scan QR Code untuk absensi
 */

checkAuth();

let html5QrCode = null;
let isScanning = false;
let currentOperator = null;
let timeSettings = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadOperatorInfo();
    await loadTimeSettings();
    await loadTodayHistory();
    initScanner();
    initManualInput();
});

/**
 * Load operator info
 */
async function loadOperatorInfo() {
    const user = auth.currentUser;
    if (user) {
        const adminDoc = await db.collection('admins').doc(user.uid).get();
        if (adminDoc.exists) {
            currentOperator = adminDoc.data().nama;
        }
    }
}

/**
 * Load time settings
 */
async function loadTimeSettings() {
    try {
        const doc = await db.collection('settings').doc('time').get();
        if (doc.exists) {
            timeSettings = doc.data();
        } else {
            // Default settings
            timeSettings = {
                jamMasukStart: '06:00',
                jamMasukEnd: '07:30',
                jamPulangStart: '14:00',
                jamPulangEnd: '16:00'
            };
        }
    } catch (error) {
        console.error('Error loading time settings:', error);
    }
}

/**
 * Initialize scanner (USB Barcode Scanner Version)
 */
function initScanner() {
    isScanning = true;
    const scannerInput = document.getElementById('scannerInput');
    
    if (scannerInput) {
        // Fokuskan input secara otomatis agar siap menerima scan
        scannerInput.focus();
        
        document.addEventListener('click', (e) => {
            if (e.target.id !== 'btnManualInput' && !e.target.closest('.swal2-container') && !e.target.closest('.sidebar')) {
                scannerInput.focus();
            }
        });
        
        // Dengarkan event keydown untuk mendeteksi Enter dari scanner
        scannerInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const scannedNisn = scannerInput.value.trim();
                
                if (scannedNisn !== '') {
                    // Kosongkan input untuk scan berikutnya
                    scannerInput.value = '';
                    
                    // Proses scan
                    if (isScanning) {
                        await onScanSuccess(scannedNisn);
                    }
                }
            }
        });
    }
}

/**
 * On scan success
 */
async function onScanSuccess(decodedText) {
    if (!isScanning) return;
    
    // Pause scanning temporarily
    isScanning = false;
    
    try {
        const nisn = decodedText.trim();
        // Calculate time status
        const now = new Date();
        const currentTimeStr = formatTime(now); // e.g. "06:15"
        
        let jenisAbsensi = 'Harian';
        let statusWaktu = 'Hadir';
        
        // Helper to convert time string to minutes
        const timeToMins = (tStr) => {
            if (!tStr) return 0;
            const parts = tStr.split(':');
            return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        };
        
        const currentMins = timeToMins(currentTimeStr);
        const masukStart = timeToMins(timeSettings.jamMasukStart || '06:00');
        const masukEnd = timeToMins(timeSettings.jamMasukEnd || '07:30');
        const pulangStart = timeToMins(timeSettings.jamPulangStart || '14:00');
        const pulangEnd = timeToMins(timeSettings.jamPulangEnd || '16:00');
        
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
        
        // DEBUG: Log QR scan result
        console.log('=== BARCODE SCAN DEBUG ===');
        console.log('Decoded Text:', decodedText);
        console.log('NISN (after trim):', nisn);
        console.log('Jenis Absensi:', jenisAbsensi);
        console.log('Status Waktu:', statusWaktu);
        
        // Find student
        const studentSnapshot = await db.collection('students')
            .where('nisn', '==', nisn)
            .where('status', '==', 'Aktif')
            .get();
        
        // DEBUG: Log query result
        console.log('Query Result Size:', studentSnapshot.size);
        
        if (studentSnapshot.empty) {
            console.log('ERROR: No student found with NISN:', nisn);
            Swal.fire({
                icon: 'error',
                title: 'Siswa Tidak Ditemukan',
                text: `NISN ${nisn} tidak terdaftar atau tidak aktif`,
                confirmButtonColor: '#EF4444'
            });
            setTimeout(() => { isScanning = true; }, 2000);
            return;
        }
        
        const studentDoc = studentSnapshot.docs[0];
        const studentData = studentDoc.data();
        
        // DEBUG: Log found student
        console.log('Found Student:', {
            id: studentDoc.id,
            nisn: studentData.nisn,
            nama: studentData.nama,
            kelas: studentData.kelas
        });
        console.log('===================');
        
        // Check duplicate
        const todayDate = getTodayDate();
        const duplicateCheck = await db.collection('attendance')
            .where('nisn', '==', nisn)
            .where('tanggal', '==', todayDate)
            .where('jenisAbsensi', '==', jenisAbsensi)
            .get();
        
        if (!duplicateCheck.empty) {
            Swal.fire({
                icon: 'warning',
                title: 'Absensi Sudah Tercatat',
                text: `${studentData.nama} sudah melakukan absensi hari ini`,
                confirmButtonColor: '#F59E0B'
            });
            setTimeout(() => { isScanning = true; }, 2000);
            return;
        }
        
        const currentTime = currentTimeStr;
        
        // Save attendance
        const attendanceData = {
            nisn: nisn,
            nama: studentData.nama,
            kelas: studentData.kelas,
            jenisAbsensi: jenisAbsensi,
            tanggal: todayDate,
            jam: currentTime,
            statusWaktu: statusWaktu,
            operator: currentOperator,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('attendance').add(attendanceData);
        
        // Success notification
        Swal.fire({
            icon: 'success',
            title: 'Absensi Berhasil!',
            html: `
                <p><strong>${studentData.nama}</strong></p>
                <p>NISN: ${nisn}</p>
                <p>Kelas: ${studentData.kelas}</p>
                <p>Status: <span style="color: #10B981">${statusWaktu}</span></p>
            `,
            confirmButtonColor: '#7C3AED',
            timer: 2000
        });
        
        // Reload history
        await loadTodayHistory();
        
        setTimeout(() => { isScanning = true; }, 2000);
        
    } catch (error) {
        console.error('Error processing scan:', error);
        showError('Terjadi kesalahan saat memproses absensi');
        setTimeout(() => { isScanning = true; }, 2000);
    }
}

/**
 * On scan error (ignore)
 */
function onScanError(error) {
    // Ignore scan errors (too noisy in console)
}

/**
 * Initialize manual input button
 */
function initManualInput() {
    const btnManual = document.getElementById('btnManualInput');
    if (btnManual) {
        btnManual.addEventListener('click', async () => {
            const { value: nisn } = await Swal.fire({
                title: 'Input NISN Manual',
                input: 'text',
                inputLabel: 'Masukkan NISN Siswa',
                inputPlaceholder: 'Contoh: 0051234567',
                showCancelButton: true,
                confirmButtonText: 'Proses',
                cancelButtonText: 'Batal',
                confirmButtonColor: '#7C3AED',
                inputValidator: (value) => {
                    if (!value) {
                        return 'NISN tidak boleh kosong!';
                    }
                    if (value.length < 6) {
                        return 'NISN minimal 6 digit!';
                    }
                }
            });
            
            if (nisn) {
                // Process like scan
                await onScanSuccess(nisn);
            }
        });
    }
}

/**
 * Determine time status (Simplified for daily attendance)
 */
function determineTimeStatus(jenisAbsensi, currentTime) {
    return 'Hadir';
}

/**
 * Convert time to minutes
 */
function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Load today's scan history
 */
async function loadTodayHistory() {
    const todayDate = getTodayDate();
    
    try {
        const snapshot = await db.collection('attendance')
            .where('tanggal', '==', todayDate)
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();
        
        const historyDiv = document.getElementById('scanHistory');
        historyDiv.innerHTML = '';
        
        if (snapshot.empty) {
            historyDiv.innerHTML = '<p class="text-center text-muted">Belum ada data scan hari ini</p>';
            return;
        }
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            const item = document.createElement('div');
            item.className = 'scan-history-item';
            item.innerHTML = `
                <div>
                    <h6 class="mb-1">${data.nama}</h6>
                    <p class="text-muted mb-0">Absen Harian - ${data.jam}</p>
                </div>
                <span class="badge badge-success">
                    ${data.statusWaktu}
                </span>
            `;
            historyDiv.appendChild(item);
        });
        
    } catch (error) {
        console.error('Error loading history:', error);
    }
}


