/**
 * Students Module
 * CRUD operations untuk data siswa
 */

checkAuth();

let currentPage = 1;
const itemsPerPage = 10;
let allStudents = [];
let filteredStudents = [];

/// Constants for classes if needed, now free-form text input
// Kept empty to avoid breaking refs if any

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadStudents();
    initSearchFilter();
    initAddButton();
    initDeleteAllStudentsButton();
    initForm();
    initPrintQRButton();
    initPrintQRModal();
});

/**
 * Load all students from Firestore
 */
async function loadStudents() {
    try {
        showLoading('Memuat data siswa...');
        
        const snapshot = await db.collection('students').get();
        
        allStudents = [];
        snapshot.forEach((doc) => {
            allStudents.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Sort client-side
        allStudents.sort((a, b) => a.nama.localeCompare(b.nama));
        
        filteredStudents = [...allStudents];
        displayStudents();
        Swal.close();
        
    } catch (error) {
        console.error('Error loading students:', error);
        showError('Gagal memuat data siswa: ' + error.message);
    }
}

/**
 * Display students in table
 */
function displayStudents() {
    const tbody = document.getElementById('studentTable');
    tbody.innerHTML = '';
    
    if (filteredStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Tidak ada data siswa</td></tr>';
        return;
    }
    
    // Pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedStudents = filteredStudents.slice(startIndex, endIndex);
    
    paginatedStudents.forEach((student, index) => {
        const kelas = student.kelas || '-';
        const noUrut = startIndex + index + 1;
        
        const row = `
            <tr>
                <td>${noUrut}</td>
                <td>${student.nama}</td>
                <td>${student.nisn}</td>
                <td>${kelas}</td>
                <td><span class="badge ${student.status === 'Aktif' ? 'badge-success' : 'badge-danger'}">${student.status}</span></td>
                <td>
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-sm btn-success" onclick="showQR('${student.id}', '${student.nisn}', '${student.nama.replace(/'/g, "\\'")}', '${kelas}')" title="Generate QR">
                            <i class="bi bi-qr-code"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-primary" onclick="editStudent('${student.id}')" title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-danger" onclick="deleteStudent('${student.id}', '${student.nama}')" title="Hapus">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
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
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '<ul class="pagination">';
    
    // Previous button
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${currentPage - 1});return false;">Previous</a>
             </li>`;
    
    // Page numbers - hanya tampilkan 1-5 halaman
    const maxPagesToShow = 5;
    let startPage = 1;
    let endPage = Math.min(totalPages, maxPagesToShow);
    
    // Jika ada lebih dari 5 halaman, geser window pagination
    if (totalPages > maxPagesToShow) {
        if (currentPage > 3) {
            startPage = currentPage - 2;
            endPage = Math.min(currentPage + 2, totalPages);
        }
        if (endPage - startPage < maxPagesToShow - 1) {
            startPage = Math.max(1, endPage - (maxPagesToShow - 1));
        }
    }
    
    // Tampilkan "..." jika ada halaman sebelumnya
    if (startPage > 1) {
        html += `<li class="page-item disabled">
                    <span class="page-link">...</span>
                 </li>`;
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        html += `<li class="page-item ${currentPage === i ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i});return false;">${i}</a>
                 </li>`;
    }
    
    // Tampilkan "..." jika ada halaman setelahnya
    if (endPage < totalPages) {
        html += `<li class="page-item disabled">
                    <span class="page-link">...</span>
                 </li>`;
    }
    
    // Next button
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="changePage(${currentPage + 1});return false;">Next</a>
             </li>`;
    
    html += '</ul>';
    pagination.innerHTML = html;
}

/**
 * Change page
 */
function changePage(page) {
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayStudents();
}

/**
 * Initialize search filter
 */
function initSearchFilter() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        
        filteredStudents = allStudents.filter((student) => {
            let classMatch = false;
            if (student.kelas) {
                const isRomanNumeral = /^(i{1,3}|iv|v|vi{1,3}|ix|x|xi{1,2}|xii)$/i.test(query);
                if (isRomanNumeral) {
                    const regex = new RegExp(`\\b${query}\\b`, 'i');
                    classMatch = regex.test(student.kelas);
                } else {
                    classMatch = student.kelas.toLowerCase().includes(query);
                }
            }

            return student.nama.toLowerCase().includes(query) ||
                   student.nisn.toLowerCase().includes(query) ||
                   (student.nis && student.nis.toLowerCase().includes(query)) ||
                   classMatch;
        });
        
        currentPage = 1;
        displayStudents();
    });
}

/**
 * Initialize add button
 */
function initAddButton() {
    document.getElementById('btnAddStudent').addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'Tambah Siswa';
        document.getElementById('studentForm').reset();
        document.getElementById('studentId').value = '';
        
        // Clear jurusan dropdown
        document.getElementById('jurusan').innerHTML = '<option value="">Pilih Jurusan...</option>';
        
        const modal = new bootstrap.Modal(document.getElementById('studentModal'));
        modal.show();
    });
}

/**
 * Initialize delete all button
 */
function initDeleteAllStudentsButton() {
    const btnDeleteAll = document.getElementById('btnDeleteAllStudents');
    if (btnDeleteAll) {
        btnDeleteAll.addEventListener('click', () => {
            Swal.fire({
                title: 'HAPUS SEMUA DATA?',
                html: 'Tindakan ini akan <b>MENGHAPUS SELURUH DATA SISWA SECARA PERMANEN</b>.<br>Data tidak dapat dikembalikan!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#EF4444',
                cancelButtonColor: '#6B7280',
                confirmButtonText: 'Ya, Hapus Semua!',
                cancelButtonText: 'Batal'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        showLoading('Menghapus semua data siswa...');
                        
                        // Firebase Firestore Batched Delete
                        const snapshot = await db.collection('students').get();
                        
                        if (snapshot.empty) {
                            Swal.close();
                            showSuccess('Tidak ada data siswa untuk dihapus.');
                            return;
                        }
                        
                        let batch = db.batch();
                        let deletedCount = 0;
                        let batchCount = 0;
                        
                        for (const doc of snapshot.docs) {
                            batch.delete(doc.ref);
                            deletedCount++;
                            batchCount++;
                            
                            // Firestore limits batch size to 500
                            if (batchCount === 450) {
                                await batch.commit();
                                batch = db.batch();
                                batchCount = 0;
                            }
                        }
                        
                        if (batchCount > 0) {
                            await batch.commit();
                        }
                        
                        await loadStudents();
                        Swal.fire({
                            icon: 'success',
                            title: 'Berhasil Dihapus',
                            text: `Sebanyak ${deletedCount} data siswa telah dihapus secara permanen.`,
                            confirmButtonColor: '#7C3AED'
                        });
                        
                    } catch (error) {
                        console.error('Error deleting all students:', error);
                        showError('Gagal menghapus data: ' + error.message);
                    }
                }
            });
        });
    }
}

/**
 * Edit student
 */
async function editStudent(id) {
    try {
        const doc = await db.collection('students').doc(id).get();
        if (!doc.exists) {
            showError('Data siswa tidak ditemukan');
            return;
        }
        
        const student = doc.data();
        
        document.getElementById('modalTitle').textContent = 'Edit Siswa';
        document.getElementById('studentId').value = id;
        document.getElementById('nisn').value = student.nisn;
        document.getElementById('nama').value = student.nama;
        document.getElementById('jenisKelamin').value = student.jenisKelamin;
        document.getElementById('alamat').value = student.alamat || '';
        document.getElementById('status').value = student.status;
        
        document.getElementById('kelas').value = student.kelas || '';
        const modal = new bootstrap.Modal(document.getElementById('studentModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error editing student:', error);
        showError('Gagal memuat data siswa');
    }
}

/**
 * Delete student
 */
async function deleteStudent(id, nama) {
    const result = await Swal.fire({
        title: 'Konfirmasi Hapus',
        text: `Hapus data siswa ${nama}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
    });
    
    if (result.isConfirmed) {
        try {
            showLoading('Menghapus data...');
            await db.collection('students').doc(id).delete();
            
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: 'Data siswa telah dihapus',
                confirmButtonColor: '#7C3AED'
            });
            
            loadStudents();
            
        } catch (error) {
            console.error('Error deleting student:', error);
            showError('Gagal menghapus data siswa');
        }
    }
}

/**
 * Initialize form submission
 */
function initForm() {
    // Remove event listener since we are not using tingkat/jurusan anymore
    
    document.getElementById('studentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('studentId').value;
        const kelas = document.getElementById('kelas').value;
        
        const studentData = {
            nisn: document.getElementById('nisn').value,
            nama: document.getElementById('nama').value,
            jenisKelamin: document.getElementById('jenisKelamin').value,
            kelas: kelas,
            alamat: document.getElementById('alamat').value,
            noHp: '', // Remove noHp field
            status: document.getElementById('status').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        try {
            showLoading('Menyimpan data...');
            
            if (id) {
                // Update
                await db.collection('students').doc(id).update(studentData);
            } else {
                // Add new
                studentData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('students').add(studentData);
            }
            
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: 'Data siswa telah disimpan',
                confirmButtonColor: '#7C3AED'
            });
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('studentModal'));
            modal.hide();
            
            loadStudents();
            
        } catch (error) {
            console.error('Error saving student:', error);
            showError('Gagal menyimpan data siswa');
        }
    });
}

// Make functions global for onclick handlers
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.changePage = changePage;

// QR Code functionality
window.showQR = showQR;
window.downloadQR = downloadQR;
window.printQR = printQR;

let currentQRCode = null;
let currentStudentData = {};

/**
 * Show QR Code for student
 */
function showQR(id, nisn, nama, kelas) {
    // Save current student for download
    currentStudentData = { id, nisn, nama, kelas };
    
    // Set UI elements
    document.getElementById('qrStudentName').textContent = nama;
    document.getElementById('qrStudentNISN').textContent = nisn;
    document.getElementById('qrStudentClass').textContent = kelas;
    
    // Clear previous QR code
    const container = document.getElementById('qrcodeContainer');
    container.innerHTML = '';
    
    // Generate QR Code
    currentQRCode = new QRCode(container, {
        text: nisn,
        width: 256,
        height: 256,
        colorDark: getQRColor(),
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('qrModal'));
    modal.show();
}

function getQRColor() {
    return "#000000";
}

/**
 * Download QR Code
 */
function downloadQR() {
    const canvas = document.querySelector('#qrcodeContainer canvas');
    if (!canvas) {
        showError('QR Code tidak ditemukan');
        return;
    }
    
    // Convert canvas to blob
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `QR_${currentStudentData.nisn}_${currentStudentData.nama}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showSuccess('QR Code berhasil didownload');
    });
}

/**
 * Print QR Code
 */
function printQR() {
    const canvas = document.querySelector('#qrcodeContainer canvas');
    if (!canvas) {
        showError('QR Code tidak ditemukan');
        return;
    }
    
    const dataUrl = canvas.toDataURL();
    
    // Create iframe for printing (bypasses pop-up blocker)
    let printFrame = document.getElementById('printFrameQR');
    if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'printFrameQR';
        printFrame.style.position = 'fixed';
        printFrame.style.top = '-9999px';
        printFrame.style.left = '-9999px';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        document.body.appendChild(printFrame);
    }
    
    const kelas = currentStudentData.kelas;
    const kelasUpper = kelas.toUpperCase();
    
    let borderClass = '';
    if (kelasUpper.includes('TKR') || kelasUpper.includes('TEKNIK KENDARAAN')) {
        borderClass = 'border-tkr';
    } else if (kelasUpper.includes('TITL') || kelasUpper.includes('INSTALASI TENAGA LISTRIK')) {
        borderClass = 'border-titl';
    } else if (kelasUpper.includes('ATPH') || kelasUpper.includes('AGRIBISNIS') || kelasUpper.includes('ATP') || kelasUpper.includes('HORTIKULTURA')) {
        borderClass = 'border-atph';
    } else if (kelasUpper.includes('TKP') || kelasUpper.includes('KONSTRUKSI') || kelasUpper.includes('PERUMAHAN')) {
        borderClass = 'border-tkp';
    }
    
    const baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
    const logoUrl = baseUrl + '/assets/img/logo-yayasan.png';
    
    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print QR Code - ${currentStudentData.nama}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: white;
                }
                .card { 
                    width: 62mm;
                    padding: 3mm;
                    text-align: center;
                    background: white;
                    height: 80mm;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-start;
                    border: 8px solid #bbb;
                    border-radius: 8mm;
                }
                .card.border-tkr { border-color: #3B82F6; }
                .card.border-titl { border-color: #EF4444; }
                .card.border-atph { border-color: #10B981; }
                .card.border-tkp { border-color: #F59E0B; }
                
                .card-header {
                    width: 100%;
                    padding: 0 0 2mm 0;
                    border-bottom: 2px solid #E5E7EB;
                    margin-bottom: 3mm;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 2mm;
                }
                .card-header img {
                    height: 10mm;
                    width: auto;
                    flex-shrink: 0;
                }
                .card-header-title {
                    font-size: 9px;
                    font-weight: bold;
                    color: #374151;
                    line-height: 1.2;
                    text-align: center;
                    flex: 1;
                }
                .card-qr {
                    width: 100%;
                    height: 40mm;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 2mm;
                    flex-shrink: 0;
                }
                .card-qr img {
                    max-width: 100%;
                    max-height: 100%;
                    width: auto;
                    height: auto;
                }
                .card-text {
                    flex-shrink: 0;
                    padding: 0 1mm;
                    width: 100%;
                }
                .card-text h3 { 
                    font-size: 11px; 
                    margin-bottom: 2px; 
                    font-weight: bold;
                    line-height: 1.2;
                    color: #1F2937;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    width: 100%;
                }
                .card-text p { 
                    font-size: 8px; 
                    margin: 1px 0; 
                    color: #6B7280;
                    line-height: 1.3;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    width: 100%;
                }
                .card-text .nisn {
                    font-weight: 600;
                    color: #374151;
                    font-size: 9px;
                }
                @media print {
                    @page { size: portrait; margin: 0; }
                    body { margin: 0; padding: 20mm; }
                }
            </style>
        </head>
        <body>
            <div class="card ${borderClass}">
                <div class="card-header">
                    <img src="${logoUrl}" alt="Logo">
                    <div class="card-header-title">Barcode Sistem Absensi Digital<br>YAYASAN NURUL HUDA KAPEDI</div>
                </div>
                <div class="card-qr">
                    <img src="${dataUrl}" alt="QR">
                </div>
                <div class="card-text">
                    <h3>${currentStudentData.nama}</h3>
                    <p class="nisn">NISN: ${currentStudentData.nisn}</p>
                    <p>${tingkat} ${jurusan}</p>
                </div>
            </div>
            <script>
                window.onload = function() {
                    setTimeout(() => {
                        window.print();
                    }, 500);
                }
            </script>
        </body>
        </html>
    `);
    
    doc.close();
}

/**
 * Initialize Cetak QR button
 */
function initPrintQRButton() {
    const btnPrintQR = document.getElementById('btnPrintQR');
    if (btnPrintQR) {
        btnPrintQR.addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('printQRModal'));
            modal.show();
        });
    }
}

/**
 * Initialize Cetak QR modal
 */
function initPrintQRModal() {
    // Handle print type change
    document.querySelectorAll('input[name="printType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const filterOptions = document.getElementById('filterOptions');
            if (e.target.value === 'filter') {
                filterOptions.style.display = 'block';
            } else {
                filterOptions.style.display = 'none';
            }
        });
    });
    
    // Handle cetak button
    document.getElementById('btnCetakQR').addEventListener('click', () => {
        const printType = document.querySelector('input[name="printType"]:checked').value;
        
        if (printType === 'filter') {
            const filterKelas = document.getElementById('filterKelas').value;
            
            if (!filterKelas) {
                showError('Masukkan kelas untuk difilter');
                return;
            }
            
            generateQRPrint(filterKelas);
        } else {
            generateQRPrint(null);
        }
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('printQRModal')).hide();
    });
}

/**
 * Generate QR print page
 */
function generateQRPrint(filterKelas) {
    showLoading('Membuat halaman cetak...');
    
    console.log('=== FILTER DEBUG ===');
    console.log('User selected: filterKelas=' + filterKelas);
    console.log('Total allStudents:', allStudents.length);
    
    // Filter students
    let studentsForPrint = allStudents;
    
    if (filterKelas) {
        const filterStr = filterKelas.toLowerCase().trim();
        
        studentsForPrint = allStudents.filter(s => {
            if (!s.kelas) return false;
            
            const isRomanNumeral = /^(i{1,3}|iv|v|vi{1,3}|ix|x|xi{1,2}|xii)$/i.test(filterStr);
            if (isRomanNumeral) {
                const regex = new RegExp(`\\b${filterStr}\\b`, 'i');
                return regex.test(s.kelas);
            }
            return s.kelas.toLowerCase().includes(filterStr);
        });
        
        console.log('Filtered students:', studentsForPrint.length);
    }
    
    if (studentsForPrint.length === 0) {
        Swal.close();
        showError('Tidak ada siswa yang sesuai dengan filter');
        return;
    }
    
    // Generate QR codes
    generateQRCodes(studentsForPrint, filterKelas);
}

/**
 * Generate QR codes for printing
 */
async function generateQRCodes(students, tingkat, jurusan) {
    try {
        showLoading('Membuat QR Code...');
        
        // Generate QR codes with proper delay
        const qrCodes = [];
        
        console.log('=== BATCH QR GENERATION START ===');
        console.log('Total students to generate:', students.length);
        
        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            
            console.log(`\n[${i + 1}/${students.length}] Generating QR for:`, {
                nama: student.nama,
                nisn: student.nisn,
                kelas: student.kelas
            });
            
            // Create temporary div for QR generation
            const tempDiv = document.createElement('div');
            tempDiv.style.display = 'none';
            tempDiv.id = `qr-temp-${i}-${Date.now()}`; // Unique ID
            document.body.appendChild(tempDiv);
            
            // Generate QR Code with NISN
            const qrInstance = new QRCode(tempDiv, {
                text: student.nisn,
                width: 120,
                height: 120,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            
            console.log(`  → QR text set to: "${student.nisn}"`);
            
            // Wait for QR to render
            await new Promise(resolve => setTimeout(resolve, 150));
            
            // Get the canvas from the QR code
            const canvas = tempDiv.querySelector('canvas');
            let qrDataUrl = '';
            
            if (canvas) {
                try {
                    qrDataUrl = canvas.toDataURL('image/png');
                    console.log(`  ✓ QR canvas converted to image`);
                } catch (e) {
                    console.error(`  ✗ Canvas error:`, e);
                }
            } else {
                console.error(`  ✗ Canvas not found in tempDiv!`);
            }
            
            const kelas = student.kelas || '-';
            
            const qrData = {
                nama: student.nama,
                nisn: student.nisn,
                kelas: kelas,
                qrImage: qrDataUrl
            };
            
            qrCodes.push(qrData);
            
            console.log(`  ✓ Added to qrCodes array:`, {
                nama: qrData.nama,
                nisn: qrData.nisn,
                hasImage: qrData.qrImage.length > 0
            });
            
            // Remove temp div
            document.body.removeChild(tempDiv);
        }
        
        console.log('\n=== BATCH QR GENERATION COMPLETE ===');
        console.log('Total QR codes generated:', qrCodes.length);
        console.log('Sample check (first 3):');
        qrCodes.slice(0, 3).forEach((qr, idx) => {
            console.log(`  [${idx}] ${qr.nama} - NISN: ${qr.nisn}`);
        });
        
        Swal.close();
        
        // Always use print page (more reliable than PDF)
        generatePrintPage(qrCodes, tingkat, jurusan);
        
    } catch (error) {
        Swal.close();
        console.error('Error generating QR codes:', error);
        showError('Gagal membuat QR Code: ' + error.message);
    }
}

/**
 * Generate print page with QR codes
 */
function generatePrintPage(qrCodes, tingkat, jurusan) {
    try {
        // Create iframe for printing (bypasses pop-up blocker)
        let printFrame = document.getElementById('printFrame');
        if (!printFrame) {
            printFrame = document.createElement('iframe');
            printFrame.id = 'printFrame';
            printFrame.style.position = 'fixed';
            printFrame.style.top = '-9999px';
            printFrame.style.left = '-9999px';
            printFrame.style.width = '0';
            printFrame.style.height = '0';
            document.body.appendChild(printFrame);
        }
        
        let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>QR Code Siswa - ${tingkat} ${jurusan}</title>
    <style>
        @page { 
            size: A4 portrait; 
            margin: 8mm;
        }
        * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
        }
        body { 
            font-family: Arial, sans-serif; 
            background: white;
            width: 210mm;
            margin: 0 auto;
        }
        .page { 
            width: 100%;
            min-height: 297mm;
            page-break-after: always;
            padding: 0;
            position: relative;
        }
        .page:last-child {
            page-break-after: auto;
        }
        .header { 
            text-align: center; 
            margin-bottom: 6mm; 
            border-bottom: 2px solid #7C3AED; 
            padding: 4mm 0;
        }
        .header h1 { 
            color: #7C3AED; 
            font-size: 14px; 
            margin-bottom: 2px; 
            font-weight: bold;
        }
        .header p { 
            color: #666; 
            font-size: 9px; 
            margin: 1px 0; 
        }
        .grid { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 6mm;
            margin: 0;
        }
        .card { 
            padding: 3mm;
            text-align: center;
            page-break-inside: avoid;
            break-inside: avoid;
            background: white;
            height: 80mm;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            position: relative;
            border: 8px solid #bbb;
            border-radius: 8mm;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .card.border-tkr { border-color: #3B82F6; }
        .card.border-titl { border-color: #EF4444; }
        .card.border-atph { border-color: #10B981; }
        .card.border-tkp { border-color: #F59E0B; }
        .card-header {
            width: 100%;
            padding: 0 0 2mm 0;
            border-bottom: 2px solid #E5E7EB;
            margin-bottom: 3mm;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2mm;
        }
        .card-header img {
            height: 10mm;
            width: auto;
            flex-shrink: 0;
        }
        .card-header-title {
            font-size: 9px;
            font-weight: bold;
            color: #374151;
            line-height: 1.2;
            text-align: center;
            flex: 1;
        }
        .card-qr {
            width: 100%;
            height: 40mm;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 2mm;
            flex-shrink: 0;
        }
        .card-qr img {
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
        }
        .card-text {
            flex-shrink: 0;
            padding: 0 1mm;
            width: 100%;
        }
        .card-text h3 { 
            font-size: 11px; 
            margin-bottom: 2px; 
            font-weight: bold;
            line-height: 1.2;
            color: #1F2937;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
        }
        .card-text p { 
            font-size: 8px; 
            margin: 1px 0; 
            color: #6B7280;
            line-height: 1.3;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
        }
        .card-text .nisn {
            font-weight: 600;
            color: #374151;
            font-size: 9px;
        }
        @media print {
            body { 
                margin: 0; 
                padding: 0; 
                background: white;
            }
            .page { 
                margin: 0; 
                padding: 8mm;
                break-after: page;
                page-break-after: always;
            }
            .page:last-child {
                break-after: auto;
                page-break-after: auto;
            }
            .grid {
                gap: 5mm;
            }
            .card {
                height: 80mm;
                padding: 3mm;
            }
            .card-qr {
                height: 40mm;
            }
        }
    </style>
</head>
<body>`;

        const baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
        const logoUrl = baseUrl + '/assets/img/logo-yayasan.png';

        // Calculate items per page
        // A4 height: 297mm - 16mm margin = 281mm
        // Header: ~20mm
        // Available: ~261mm
        // Card height: 85mm
        // Gap: 6mm
        // Row height: 85mm + 6mm = 91mm
        // Rows per page: 261mm / 91mm = 2.8 ≈ 2 rows
        // Items per page: 3 cols x 3 rows = 9 items
        const itemsPerPage = 9;
        const totalPages = Math.ceil(qrCodes.length / itemsPerPage);
        
        for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
            html += '<div class="page">';
            
            // Add header on every page
            const filterStr = tingkat ? `Filter: ${tingkat}` : 'Semua Siswa';
            html += `
                <div class="header">
                    <h1>QR Code Siswa</h1>
                    <p>Sistem Absensi Digital YAYASAN NURUL HUDA KAPEDI</p>
                    <p>${filterStr} (Halaman ${pageIdx + 1}/${totalPages})</p>
                </div>
            `;
            
            html += '<div class="grid">';
            
            // Add cards for this page
            const startIdx = pageIdx * itemsPerPage;
            const endIdx = Math.min(startIdx + itemsPerPage, qrCodes.length);
            
            console.log(`\n=== PAGE ${pageIdx + 1} HTML GENERATION ===`);
            console.log(`Items: ${startIdx} to ${endIdx - 1}`);
            
            for (let i = startIdx; i < endIdx; i++) {
                const qr = qrCodes[i];
                const qrImg = qr.qrImage || '';
                
                console.log(`  [${i}] Card: ${qr.nama} (NISN: ${qr.nisn})`);
                
                // Determine border color based on kelas/jurusan
                let borderClass = '';
                let badgeClass = '';
                const jurusanUpper = (qr.jurusan || qr.kelas || '').toUpperCase();
                
                if (jurusanUpper.includes('TKR') || jurusanUpper.includes('TEKNIK KENDARAAN')) {
                    borderClass = 'border-tkr';
                    badgeClass = 'badge-tkr';
                } else if (jurusanUpper.includes('TITL') || jurusanUpper.includes('INSTALASI TENAGA LISTRIK')) {
                    borderClass = 'border-titl';
                    badgeClass = 'badge-titl';
                } else if (jurusanUpper.includes('ATPH') || jurusanUpper.includes('AGRIBISNIS') || jurusanUpper.includes('ATP') || jurusanUpper.includes('HORTIKULTURA')) {
                    borderClass = 'border-atph';
                    badgeClass = 'badge-atph';
                } else if (jurusanUpper.includes('TKP') || jurusanUpper.includes('KONSTRUKSI') || jurusanUpper.includes('PERUMAHAN')) {
                    borderClass = 'border-tkp';
                    badgeClass = 'badge-tkp';
                }
                
                html += `
                    <div class="card ${borderClass}">
                        <div class="card-header">
                            <img src="${logoUrl}" alt="Logo">
                            <div class="card-header-title">Barcode Sistem Absensi Digital<br>YAYASAN NURUL HUDA KAPEDI</div>
                        </div>
                        <div class="card-qr">
                            ${qrImg ? `<img src="${qrImg}" alt="QR">` : '<div style="color:#ccc;font-size:9px;">QR Error</div>'}
                        </div>
                        <div class="card-text">
                            <h3>${qr.nama}</h3>
                            <p class="nisn">NISN: ${qr.nisn}</p>
                            <p>${qr.kelas}</p>
                        </div>
                    </div>
                `;
            }
            
            html += '</div></div>'; // Close grid and page
        }
        
        html += '</body></html>';
        
        const doc = printFrame.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
        
        Swal.close();
        
        // Auto-focus and print after images load
        setTimeout(() => {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
        }, 1200);
        
    } catch (error) {
        Swal.close();
        console.error('Error generating print page:', error);
        showError('Gagal membuat halaman cetak: ' + error.message);
    }
}


