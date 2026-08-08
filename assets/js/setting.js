/**
 * Settings Module
 * Pengaturan aplikasi
 */

checkAuth();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    initSchoolForm();
    initTimeForm();
});

/**
 * Load current settings
 */
async function loadSettings() {
    try {
        // Load school settings
        const schoolDoc = await db.collection('settings').doc('school').get();
        if (schoolDoc.exists) {
            const schoolData = schoolDoc.data();
            document.getElementById('schoolName').value = schoolData.name || '';
            document.getElementById('schoolAddress').value = schoolData.address || '';
        }
        
        // Load time settings
        const timeDoc = await db.collection('settings').doc('time').get();
        if (timeDoc.exists) {
            const timeData = timeDoc.data();
            document.getElementById('jamMasukStart').value = timeData.jamMasukStart || '06:00';
            document.getElementById('jamMasukEnd').value = timeData.jamMasukEnd || '07:30';
            document.getElementById('jamPulangStart').value = timeData.jamPulangStart || '14:00';
            document.getElementById('jamPulangEnd').value = timeData.jamPulangEnd || '16:00';
        }
        
    } catch (error) {
        console.error('Error loading settings:', error);
        showError('Gagal memuat pengaturan');
    }
}

/**
 * Initialize school form
 */
function initSchoolForm() {
    document.getElementById('schoolForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const schoolData = {
            name: document.getElementById('schoolName').value,
            address: document.getElementById('schoolAddress').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        try {
            showLoading('Menyimpan pengaturan...');
            
            await db.collection('settings').doc('school').set(schoolData, { merge: true });
            
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: 'Pengaturan sekolah telah disimpan',
                confirmButtonColor: '#7C3AED'
            });
            
        } catch (error) {
            console.error('Error saving school settings:', error);
            showError('Gagal menyimpan pengaturan sekolah');
        }
    });
}

/**
 * Initialize time form
 */
function initTimeForm() {
    document.getElementById('timeSettingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const timeData = {
            jamMasukStart: document.getElementById('jamMasukStart').value,
            jamMasukEnd: document.getElementById('jamMasukEnd').value,
            jamPulangStart: document.getElementById('jamPulangStart').value,
            jamPulangEnd: document.getElementById('jamPulangEnd').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Validate times
        if (!validateTimeSettings(timeData)) {
            showError('Jam mulai harus lebih awal dari jam terakhir');
            return;
        }
        
        try {
            showLoading('Menyimpan pengaturan waktu...');
            
            await db.collection('settings').doc('time').set(timeData, { merge: true });
            
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: 'Pengaturan waktu telah disimpan',
                confirmButtonColor: '#7C3AED'
            });
            
        } catch (error) {
            console.error('Error saving time settings:', error);
            showError('Gagal menyimpan pengaturan waktu');
        }
    });
}

/**
 * Validate time settings
 */
function validateTimeSettings(timeData) {
    const masukStart = new Date(`2000-01-01T${timeData.jamMasukStart}`);
    const masukEnd = new Date(`2000-01-01T${timeData.jamMasukEnd}`);
    const pulangStart = new Date(`2000-01-01T${timeData.jamPulangStart}`);
    const pulangEnd = new Date(`2000-01-01T${timeData.jamPulangEnd}`);
    
    return (masukStart < masukEnd) && (pulangStart < pulangEnd) && (masukEnd < pulangStart);
}

/**
 * Convert time to minutes
 */
function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;

