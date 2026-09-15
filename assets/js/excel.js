/**
 * Excel Import Module
 * Import data siswa dari file Excel
 */

let excelData = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    initUploadArea();
    initImportButton();
});

/**
 * Initialize upload area
 */
function initUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('excelFile');
    const btnSelectFile = document.getElementById('btnSelectFile');
    
    // Click to select file
    btnSelectFile.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#7C3AED';
        uploadArea.style.background = 'rgba(124, 58, 237, 0.05)';
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '';
        uploadArea.style.background = '';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '';
        uploadArea.style.background = '';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });
}

/**
 * Handle file upload
 */
function handleFile(file) {
    // Validate file type
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (!validTypes.includes(file.type)) {
        showError('Format file tidak valid. Gunakan file .xlsx atau .xls');
        return;
    }
    
    // Show file info
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileInfo').style.display = 'block';
    
    // Read file
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Get first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData.length === 0) {
                showError('File Excel kosong');
                return;
            }
            
            // Process data
            processExcelData(jsonData);
            
        } catch (error) {
            console.error('Error reading Excel:', error);
            showError('Gagal membaca file Excel');
        }
    };
    
    reader.readAsArrayBuffer(file);
}

/**
 * Process Excel data - Support both old and new format
 */
function processExcelData(data) {
    excelData = [];
    
    data.forEach((row, index) => {
        // Support both old and new format
        // New format: NO, NAMA, NISN, KELAS
        // Old format: NISN, Nama, Jenis Kelamin, Kelas, etc.
        
        const nisn = row.NISN || row['NISN'];
        const nama = row.Nama || row['NAMA'];
        
        // Validate required fields
        if (!nisn || !nama) {
            console.warn(`Baris ${index + 2} dilewati: NISN atau Nama kosong`);
            return;
        }
        
        // Get class info
        let kelas = '-';
        if (row.KELAS) {
            kelas = String(row.KELAS).trim();
        } else if (row.TINGKATAN) {
            kelas = String(row.TINGKATAN).trim();
            if (row.JURUSAN) {
                kelas = `${kelas} ${row.JURUSAN}`.trim();
            }
        } else if (row.Kelas) {
            kelas = row.Kelas; // Old format
        }
        
        const student = {
            nisn: String(nisn).trim(),
            nama: String(nama).trim(),
            jenisKelamin: row['Jenis Kelamin'] || 'Laki-laki',
            kelas: kelas,
            alamat: row.Alamat || '',
            noHp: row['No HP'] ? String(row['No HP']).trim() : '',
            status: row.Status || 'Aktif'
        };
        
        excelData.push(student);
    });
    
    if (excelData.length === 0) {
        console.warn('Tidak ada data yang valid untuk diimport');
        showError('Tidak ada data yang valid untuk diimport. Periksa format Excel Anda.');
        return;
    }
    
    // Display preview
    displayPreview();
    
    // Enable import button
    document.getElementById('btnImport').disabled = false;
}

/**
 * Display preview of imported data
 */
function displayPreview() {
    const previewTable = document.getElementById('previewTable');
    previewTable.innerHTML = '';
    
    // Show only first 5 rows
    const previewData = excelData.slice(0, 5);
    
    previewData.forEach((student, index) => {
        // Parse kelas back into tingkat and jurusan for display
        let tingkat = '-';
        let jurusan = '-';
        
        if (student.kelas && student.kelas !== '-') {
            const parts = student.kelas.trim().split(/\s+/);
            if (parts.length >= 2) {
                tingkat = parts[0];
                jurusan = parts.slice(1).join(' ');
            } else {
                tingkat = student.kelas;
            }
        }
        
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td>${student.nama}</td>
                <td>${student.nisn}</td>
                <td>${tingkat}</td>
                <td>${jurusan}</td>
                <td><span class="badge ${student.status === 'Aktif' ? 'badge-success' : 'badge-danger'}">${student.status}</span></td>
            </tr>
        `;
        previewTable.innerHTML += row;
    });
    
    // Show total
    document.getElementById('totalData').textContent = excelData.length;
    
    // Show preview section
    document.getElementById('previewSection').style.display = 'block';
}

/**
 * Initialize import button
 */
function initImportButton() {
    document.getElementById('btnImport').addEventListener('click', async () => {
        if (excelData.length === 0) {
            showError('Tidak ada data untuk diimport');
            return;
        }
        
        const result = await Swal.fire({
            title: 'Konfirmasi Import',
            text: `Import ${excelData.length} data siswa ke database?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#7C3AED',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Ya, Import',
            cancelButtonText: 'Batal'
        });
        
        if (result.isConfirmed) {
            await importToFirestore();
        }
    });
}

/**
 * Import data to Firestore
 */
async function importToFirestore() {
    try {
        showLoading('Mengimport data ke database...');
        
        let successCount = 0;
        let errorCount = 0;
        
        // Use batch for better performance
        const batch = db.batch();
        
        for (const student of excelData) {
            try {
                // Check if NISN already exists
                const existingStudent = await db.collection('students')
                    .where('nisn', '==', student.nisn)
                    .get();
                
                if (!existingStudent.empty) {
                    // Update existing
                    const docId = existingStudent.docs[0].id;
                    const docRef = db.collection('students').doc(docId);
                    batch.update(docRef, {
                        ...student,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    // Add new
                    const docRef = db.collection('students').doc();
                    batch.set(docRef, {
                        ...student,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                
                successCount++;
                
            } catch (error) {
                console.error(`Error importing student ${student.nisn}:`, error);
                errorCount++;
            }
        }
        
        // Commit batch
        await batch.commit();
        
        Swal.fire({
            icon: 'success',
            title: 'Import Berhasil!',
            html: `
                <p>Berhasil: ${successCount} data</p>
                ${errorCount > 0 ? `<p>Gagal: ${errorCount} data</p>` : ''}
            `,
            confirmButtonColor: '#7C3AED'
        }).then(() => {
            // Reset
            excelData = [];
            document.getElementById('excelFile').value = '';
            document.getElementById('fileInfo').style.display = 'none';
            document.getElementById('previewSection').style.display = 'none';
            document.getElementById('btnImport').disabled = true;
        });
        
    } catch (error) {
        console.error('Error importing to Firestore:', error);
        showError('Gagal mengimport data ke database');
    }
}

/**
 * Download template Excel
 */
function downloadTemplate() {
    try {
        // Create workbook
        const wb = XLSX.utils.book_new();
        
        // Template data dengan format baru: NO | NAMA | NISN | KELAS
        const templateData = [
            {
                'NO': 1,
                'NAMA': 'Ahmad Desmon Firmanda',
                'NISN': '253164',
                'KELAS': 'XI TITL A'
            },
            {
                'NO': 2,
                'NAMA': 'Ajni Sulian Muhammad',
                'NISN': '253155',
                'KELAS': 'XI TITL A'
            },
            {
                'NO': 3,
                'NAMA': 'Adrian Akhinaya Asliono',
                'NISN': '253178',
                'KELAS': 'XI TITL B'
            },
            {
                'NO': 4,
                'NAMA': 'Abdul Hafiz',
                'NISN': '253203',
                'KELAS': 'XI TKR B'
            }
        ];
        
        // Convert to worksheet
        const ws = XLSX.utils.json_to_sheet(templateData);
        
        // Set column widths
        ws['!cols'] = [
            { wch: 5 },  // NO
            { wch: 30 }, // NAMA
            { wch: 12 }, // NISN
            { wch: 15 }  // KELAS
        ];
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
        
        // Add instruction sheet
        const instructions = [
            { 'PETUNJUK PENGISIAN': 'Kolom yang WAJIB diisi:' },
            { 'PETUNJUK PENGISIAN': '1. NAMA (wajib)' },
            { 'PETUNJUK PENGISIAN': '2. NISN (wajib, unik per siswa)' },
            { 'PETUNJUK PENGISIAN': '' },
            { 'PETUNJUK PENGISIAN': 'Kolom opsional:' },
            { 'PETUNJUK PENGISIAN': '- NO: Nomor urut (bisa dihitung otomatis)' },
            { 'PETUNJUK PENGISIAN': '- KELAS: Kelas/Tingkatan dan Jurusan siswa' },
            { 'PETUNJUK PENGISIAN': '  Contoh: X TKR A, XI TITL B, XII TKP C' },
            { 'PETUNJUK PENGISIAN': '' },
            { 'PETUNJUK PENGISIAN': 'TIPS:' },
            { 'PETUNJUK PENGISIAN': '- Hapus data contoh di sheet "Data Siswa"' },
            { 'PETUNJUK PENGISIAN': '- Isi dengan data siswa Anda' },
            { 'PETUNJUK PENGISIAN': '- Gunakan format yang konsisten' }
        ];
        
        const wsInstructions = XLSX.utils.json_to_sheet(instructions);
        wsInstructions['!cols'] = [{ wch: 60 }];
        XLSX.utils.book_append_sheet(wb, wsInstructions, 'Petunjuk');
        
        // Generate filename dengan tanggal
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const fileName = `Template_Data_Siswa_${dateStr}.xlsx`;
        
        // Write and download
        XLSX.writeFile(wb, fileName);
        
        showSuccess('Template Excel berhasil didownload! Baca sheet "Petunjuk" untuk cara pengisian.');
        
    } catch (error) {
        console.error('Error downloading template:', error);
        showError('Gagal mendownload template Excel');
    }
}

// Initialize download template button
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    const btnDownloadTemplate = document.getElementById('btnDownloadTemplate');
    if (btnDownloadTemplate) {
        btnDownloadTemplate.addEventListener('click', downloadTemplate);
    }
});


