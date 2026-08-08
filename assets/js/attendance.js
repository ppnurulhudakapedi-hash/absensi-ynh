/**
 * Attendance Module
 * Menampilkan data absensi dengan filter
 */

checkAuth();

let currentPage = 1;
const itemsPerPage = 15;
let allAttendance = [];
let filteredAttendance = [];


// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    initResetButton();
});

/**
 * Load all attendance data for the selected date
 */
async function loadAttendance() {
    const filterDate = document.getElementById('filterDate').value;
    if (!filterDate) return;
    
    try {
        showLoading('Memuat data absensi...');
        
        // 1. Ambil data semua siswa aktif
        const studentsSnapshot = await db.collection('students')
            .where('status', '==', 'Aktif')
            .get();
            
        const students = [];
        studentsSnapshot.forEach(doc => {
            students.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // 2. Ambil data absensi pada tanggal terpilih
        const attendanceSnapshot = await db.collection('attendance')
            .where('tanggal', '==', filterDate)
            .get();
            
        const attendanceByNisn = {};
        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            const docId = doc.id;
            const nisn = data.nisn;
            
            if (!attendanceByNisn[nisn]) {
                attendanceByNisn[nisn] = {
                    jamDatang: '-',
                    jamPulang: '-',
                    statusWaktu: '-',
                    statusKehadiran: 'Belum Absen',
                    docIdMasuk: null,
                    docIdPulang: null,
                    manualDocId: null
                };
            }
            
            // Jika ada manual input (Alpa/Sakit/Izin tanpa scan masuk/pulang)
            if (!data.jenisAbsensi || data.jenisAbsensi === 'Manual') {
                attendanceByNisn[nisn].statusKehadiran = data.statusKehadiran || data.statusWaktu;
                attendanceByNisn[nisn].manualDocId = docId;
            } 
            else if (data.jenisAbsensi === 'Masuk' || data.jenisAbsensi === 'Absen Masuk') {
                attendanceByNisn[nisn].jamDatang = data.jam;
                attendanceByNisn[nisn].statusWaktu = data.statusWaktu;
                attendanceByNisn[nisn].docIdMasuk = docId;
                // Jika tidak ada manual overwrite, hitung sbg Hadir
                if (attendanceByNisn[nisn].statusKehadiran === 'Belum Absen') {
                    attendanceByNisn[nisn].statusKehadiran = 'Hadir';
                }
            } 
            else if (data.jenisAbsensi === 'Pulang' || data.jenisAbsensi === 'Absen Pulang') {
                attendanceByNisn[nisn].jamPulang = data.jam;
                attendanceByNisn[nisn].docIdPulang = docId;
                if (attendanceByNisn[nisn].statusKehadiran === 'Belum Absen') {
                    attendanceByNisn[nisn].statusKehadiran = 'Hadir';
                }
            }
            
            // Override if document specifically sets a different status
            if (data.statusKehadiran && data.statusKehadiran !== 'Belum Absen' && data.statusKehadiran !== 'Hadir') {
                attendanceByNisn[nisn].statusKehadiran = data.statusKehadiran;
            }
        });
        
        // 3. Gabungkan data
        allAttendance = students.map(student => {
            const att = attendanceByNisn[student.nisn] || {
                jamDatang: '-',
                jamPulang: '-',
                statusWaktu: '-',
                statusKehadiran: 'Belum Absen',
                docIdMasuk: null,
                docIdPulang: null,
                manualDocId: null
            };
            
            return {
                nisn: student.nisn,
                nama: student.nama,
                kelas: student.kelas,
                tanggal: filterDate,
                ...att
            };
        });
        
        applyFiltersLocal();
        Swal.close();
        
    } catch (error) {
        console.error('Error loading attendance:', error);
        showError('Gagal memuat data absensi');
    }
}

/**
 * Display attendance in table
 */
function displayAttendance() {
    const tbody = document.getElementById('attendanceTable');
    tbody.innerHTML = '';
    
    if (filteredAttendance.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Tidak ada data absensi</td></tr>';
        return;
    }
    
    // Pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredAttendance.slice(startIndex, endIndex);
    
    let no = startIndex + 1;
    paginatedData.forEach((data) => {
        const kelas = data.kelas || '-';
        const tglStr = formatDate(new Date(data.tanggal));
        
        // Tentukan warna badge keterangan waktu
        let badgeWaktu = '';
        if (data.statusWaktu === 'Tepat Waktu') badgeWaktu = '<span class="text-success"><i class="bi bi-check-all"></i> Tepat Waktu</span>';
        else if (data.statusWaktu === 'Terlambat') badgeWaktu = '<span class="text-warning"><i class="bi bi-exclamation-triangle"></i> Terlambat</span>';
        else badgeWaktu = '<span class="text-muted">-</span>';
        
        // Format tanggal seperti di gambar (misal: 1 Jun 2026)
        const tglParts = new Date(data.tanggal).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'});

        // Tentukan class status
        let statusClass = '';
        const s = data.statusKehadiran;
        if (s === 'Hadir') statusClass = 'status-hadir';
        else if (s === 'Sakit') statusClass = 'status-sakit';
        else if (s === 'Izin') statusClass = 'status-izin';
        else if (s === 'Alpa') statusClass = 'status-alpa';
        else statusClass = 'status-belum';

        const row = `
            <tr>
                <td class="text-muted">${no++}</td>
                <td class="text-muted">${tglParts}</td>
                <td class="fw-bold">${data.nama}</td>
                <td><span class="badge bg-light text-dark border">${kelas}</span></td>
                <td class="text-muted">${data.jamDatang}</td>
                <td class="text-muted">${data.jamPulang}</td>
                <td>${badgeWaktu}</td>
                <td>
                    <select class="select-status ${statusClass}" onchange="updateStatus(this, '${data.nisn}', '${data.nama}', '${data.kelas}', '${data.tanggal}')">
                        <option value="Belum Absen" ${s === 'Belum Absen' ? 'selected' : ''}>Belum Absen</option>
                        <option value="Hadir" ${s === 'Hadir' ? 'selected' : ''}>Hadir</option>
                        <option value="Sakit" ${s === 'Sakit' ? 'selected' : ''}>Sakit</option>
                        <option value="Izin" ${s === 'Izin' ? 'selected' : ''}>Izin</option>
                        <option value="Alpa" ${s === 'Alpa' ? 'selected' : ''}>Alpa</option>
                    </select>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
    
    renderPagination();
}

/**
 * Render pagination
 */
function renderPagination() {
    const totalPages = Math.ceil(filteredAttendance.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '<ul class="pagination">';
    
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Previous</a>
             </li>`;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<li class="page-item ${currentPage === i ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                     </li>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }
    
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Next</a>
             </li>`;
    
    html += '</ul>';
    pagination.innerHTML = html;
}

/**
 * Change page
 */
function changePage(page) {
    const totalPages = Math.ceil(filteredAttendance.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayAttendance();
}

/**
 * Initialize filters
 */
function initFilters() {
    // Set today's date as default
    document.getElementById('filterDate').valueAsDate = new Date();
    
    // Date filter
    document.getElementById('filterDate').addEventListener('change', (e) => applyFilters(e));
    
    // Status filter
    document.getElementById('filterStatus').addEventListener('change', (e) => applyFilters(e));
    
    // Search filter
    document.getElementById('searchAttendance').addEventListener('input', (e) => applyFilters(e));
    
    // Apply initial filter (today)
    loadAttendance();
}

/**
 * Apply filters locally on the already fetched data
 */
function applyFiltersLocal() {
    const filterStatus = document.getElementById('filterStatus').value;
    const searchQuery = document.getElementById('searchAttendance').value.toLowerCase();
    
    filteredAttendance = allAttendance.filter((data) => {
        // Status filter
        if (filterStatus && data.statusKehadiran !== filterStatus) return false;
        
        // Search filter
        if (searchQuery) {
            const searchText = `${data.nama} ${data.nisn} ${data.kelas}`.toLowerCase();
            if (!searchText.includes(searchQuery)) return false;
        }
        
        return true;
    });
    
    currentPage = 1;
    displayAttendance();
}

/**
 * Apply all filters (triggers data reload if date changes)
 */
function applyFilters(event) {
    // If the event was fired by the date input changing, we must fetch new data from Firestore
    if (event && event.target && event.target.id === 'filterDate') {
        loadAttendance();
    } else {
        // Otherwise just filter the existing local data
        applyFiltersLocal();
    }
}

/**
 * Update Status ke Firestore
 */
async function updateStatus(selectElement, nisn, nama, kelas, tanggal) {
    const newStatus = selectElement.value;
    
    // Ubah class warna secara langsung sebelum async
    selectElement.className = 'select-status';
    if (newStatus === 'Hadir') selectElement.classList.add('status-hadir');
    else if (newStatus === 'Sakit') selectElement.classList.add('status-sakit');
    else if (newStatus === 'Izin') selectElement.classList.add('status-izin');
    else if (newStatus === 'Alpa') selectElement.classList.add('status-alpa');
    else selectElement.classList.add('status-belum');
    
    selectElement.disabled = true;
    
    try {
        // Cari apakah document attendance manual (atau existing) untuk anak ini & tanggal ini sudah ada
        const existingDocs = await db.collection('attendance')
            .where('nisn', '==', nisn)
            .where('tanggal', '==', tanggal)
            .get();
            
        let docFound = false;
        const batch = db.batch();
        
        existingDocs.forEach(doc => {
            docFound = true;
            batch.update(doc.ref, {
                statusKehadiran: newStatus
            });
        });
        
        // Jika belum ada doc sama sekali (Alpa/Sakit tanpa scan)
        if (!docFound) {
            const newDocRef = db.collection('attendance').doc();
            batch.set(newDocRef, {
                nisn: nisn,
                nama: nama,
                kelas: kelas,
                tanggal: tanggal,
                jam: '-',
                jenisAbsensi: 'Manual',
                statusWaktu: '-',
                statusKehadiran: newStatus,
                operator: auth.currentUser ? auth.currentUser.uid : 'Admin',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        await batch.commit();
        
        // Update local data array so it doesn't revert on pagination
        const studentIndex = allAttendance.findIndex(s => s.nisn === nisn);
        if (studentIndex > -1) {
            allAttendance[studentIndex].statusKehadiran = newStatus;
        }
        
    } catch (error) {
        console.error("Error updating status:", error);
        Swal.fire({
            icon: 'error',
            title: 'Gagal',
            text: 'Gagal memperbarui status kehadiran',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    } finally {
        selectElement.disabled = false;
    }
}

/**
 * Initialize reset button
 */
function initResetButton() {
    document.getElementById('btnResetAbsensi').addEventListener('click', async () => {
        const result = await Swal.fire({
            title: '⚠️ Peringatan!',
            html: `
                <p><strong>Apakah Anda yakin ingin menghapus SEMUA data absensi?</strong></p>
                <p style="color: #EF4444; margin-top: 10px;">
                    <i class="bi bi-exclamation-triangle"></i> 
                    Tindakan ini TIDAK DAPAT dibatalkan!
                </p>
                <p style="margin-top: 10px;">Semua data absensi akan dihapus secara permanen.</p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Hapus Semua',
            cancelButtonText: 'Batal',
            focusCancel: true
        });
        
        if (result.isConfirmed) {
            // Double confirmation
            const confirm2 = await Swal.fire({
                title: 'Konfirmasi Terakhir',
                text: 'Ketik "HAPUS" untuk melanjutkan',
                input: 'text',
                inputPlaceholder: 'Ketik HAPUS',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Hapus Semua Data',
                cancelButtonText: 'Batal',
                inputValidator: (value) => {
                    if (value !== 'HAPUS') {
                        return 'Ketik "HAPUS" dengan huruf kapital untuk melanjutkan';
                    }
                }
            });
            
            if (confirm2.isConfirmed) {
                await resetAllAttendance();
            }
        }
    });
}

/**
 * Reset all attendance data
 */
async function resetAllAttendance() {
    try {
        showLoading('Menghapus semua data absensi...');
        
        // Get all attendance documents
        const snapshot = await db.collection('attendance').get();
        
        if (snapshot.empty) {
            Swal.fire({
                icon: 'info',
                title: 'Tidak Ada Data',
                text: 'Tidak ada data absensi untuk dihapus',
                confirmButtonColor: '#7C3AED'
            });
            return;
        }
        
        // Delete in batches (Firestore limit: 500 per batch)
        const batchSize = 500;
        let batch = db.batch();
        let count = 0;
        let totalDeleted = 0;
        
        for (const doc of snapshot.docs) {
            batch.delete(doc.ref);
            count++;
            totalDeleted++;
            
            // Commit batch when reaching limit
            if (count >= batchSize) {
                await batch.commit();
                batch = db.batch();
                count = 0;
            }
        }
        
        // Commit remaining deletes
        if (count > 0) {
            await batch.commit();
        }
        
        Swal.fire({
            icon: 'success',
            title: 'Berhasil!',
            text: `${totalDeleted} data absensi telah dihapus`,
            confirmButtonColor: '#7C3AED'
        });
        
        // Reload data
        allAttendance = [];
        filteredAttendance = [];
        displayAttendance();
        
    } catch (error) {
        console.error('Error resetting attendance:', error);
        showError('Gagal menghapus data absensi: ' + error.message);
    }
}

// Make function global
window.changePage = changePage;


