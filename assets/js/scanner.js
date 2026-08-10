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
        
        // Listener keydown sudah dihapus karena sekarang ditangani oleh global-scanner.js
        console.log('Scanner listener is now handled globally');
    }
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
                await processGlobalScan(nisn);
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


