/**
 * Report Module
 * Generate dan export laporan absensi
 */

checkAuth();

let reportData = [];// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setDefaultMonth();
    initFilterButton();
    initExportButtons();
});

/**
 * Set default month (current month)
 */
function setDefaultMonth() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    document.getElementById('filterMonth').value = `${year}-${month}`;
}


/**
 * Initialize filter button
 */
function initFilterButton() {
    document.getElementById('btnFilterReport').addEventListener('click', async () => {
        await generateReport();
    });
}

/**
 * Generate report based on filters
 */
async function generateReport() {
    const filterMonth = document.getElementById('filterMonth').value;
    const filterKelas = document.getElementById('filterKelas').value;
    
    if (!filterMonth) {
        showError('Pilih bulan untuk laporan');
        return;
    }
    
    try {
        showLoading('Membuat laporan...');
        
        // Calculate start and end date from month
        const [year, month] = filterMonth.split('-');
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
        
        console.log(`Querying from ${startDate} to ${endDate}`);
        
        // 1. Ambil data semua siswa aktif
        let studentsQuery = db.collection('students').where('status', '==', 'Aktif');
        const studentsSnapshot = await studentsQuery.get();
        
        let students = [];
        studentsSnapshot.forEach(doc => {
            const data = doc.data();
            if (filterKelas) {
                const kelasVal = (data.kelas || '').toLowerCase();
                const filterText = filterKelas.toLowerCase().trim();
                
                let match = false;
                // Penanganan khusus untuk tingkat Romawi (VII, VIII, IX, X, XI, XII) agar tidak bentrok
                const isRomanNumeral = /^(i{1,3}|iv|v|vi{1,3}|ix|x|xi{1,2}|xii)$/i.test(filterText);
                if (isRomanNumeral) {
                    const regex = new RegExp(`\\b${filterText}\\b`, 'i');
                    match = regex.test(kelasVal);
                } else {
                    match = kelasVal.includes(filterText);
                }
                
                if (!match) {
                    return; // Skip
                }
            }
            students.push({
                id: doc.id,
                nisn: data.nisn,
                nama: data.nama,
                kelas: data.kelas || '-'
            });
        });
        
        // Sort students by name
        students.sort((a, b) => a.nama.localeCompare(b.nama));
        
        // 2. Ambil data absensi selama 1 bulan
        const attendanceSnapshot = await db.collection('attendance')
            .where('tanggal', '>=', startDate)
            .where('tanggal', '<=', endDate)
            .get();
            
        // 3. Kumpulkan active dates (hari aktif sekolah) dan petakan data absensi
        const activeDates = new Set();
        const attendanceMap = {}; // format: { nisn: { tanggal: status } }
        
        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            const nisn = data.nisn;
            const tgl = data.tanggal;
            
            activeDates.add(tgl);
            
            if (!attendanceMap[nisn]) {
                attendanceMap[nisn] = {};
            }
            
            // Tentukan status harian
            let dailyStatus = 'Hadir'; // default if scan exists
            if (data.statusKehadiran && data.statusKehadiran !== 'Belum Absen') {
                dailyStatus = data.statusKehadiran;
            } else if (data.jenisAbsensi === 'Manual' && data.statusWaktu !== 'Tepat Waktu' && data.statusWaktu !== 'Terlambat') {
                 // Fallback untuk data manual lama
                 dailyStatus = data.statusKehadiran || 'Alpa';
            }
            
            // Jika dalam 1 hari ada 2 record (masuk & pulang), pastikan tidak menimpa status manual (sakit/izin)
            if (!attendanceMap[nisn][tgl] || (attendanceMap[nisn][tgl] === 'Hadir' && dailyStatus !== 'Hadir')) {
                attendanceMap[nisn][tgl] = dailyStatus;
            }
        });
        
        // 4. Rekapitulasi per siswa
        reportData = students.map(student => {
            let hadir = 0, sakit = 0, izin = 0, alpa = 0;
            const studentAtt = attendanceMap[student.nisn] || {};
            
            // Cek setiap hari aktif sekolah
            activeDates.forEach(date => {
                const status = studentAtt[date];
                
                if (status === 'Hadir') hadir++;
                else if (status === 'Sakit') sakit++;
                else if (status === 'Izin') izin++;
                else if (status === 'Alpa') alpa++;
                else alpa++; // Jika tidak ada record sama sekali di hari aktif, otomatis Alpa
            });
            
            return {
                nisn: student.nisn,
                nama: student.nama,
                kelas: student.kelas,
                hadir, sakit, izin, alpa
            };
        });
        
        displayReport();
        Swal.close();
        
    } catch (error) {
        console.error('Error generating report:', error);
        showError('Gagal membuat laporan: ' + error.message);
    }
}

/**
 * Parse kelas menjadi tingkat dan jurusan
 * Handle both short (XI TKR A) and long format (XI Teknik Kendaraan Ringan A)
 */
function parseKelas(kelas) {
    if (!kelas || kelas === '-') {
        return { tingkat: '-', jurusan: '-' };
    }
    
    const kelasUpper = kelas.toUpperCase().trim();
    
    // Extract tingkat (X, XI, XII)
    const tingkatMatch = kelasUpper.match(/^(X|XI|XII)\s+/);
    if (!tingkatMatch) {
        return { tingkat: kelas, jurusan: '-' };
    }
    
    const tingkat = tingkatMatch[1];
    const sisaNama = kelasUpper.substring(tingkatMatch[0].length).trim();
    
    // Try to identify jurusan and convert to full name
    let jurusan = sisaNama;
    
    // Check if it's a short format and convert to long format
    if (sisaNama.startsWith('TKR')) {
        jurusan = sisaNama.replace('TKR', 'TEKNIK KENDARAAN RINGAN');
    } else if (sisaNama.startsWith('TITL')) {
        jurusan = sisaNama.replace('TITL', 'TEKNIK INSTALASI TENAGA LISTRIK');
    } else if (sisaNama.startsWith('TKP')) {
        jurusan = sisaNama.replace('TKP', 'TEKNIK KONSTRUKSI DAN PERUMAHAN');
    } else if (sisaNama.startsWith('ATPH')) {
        jurusan = sisaNama.replace('ATPH', 'AGRIBISNIS TANAMAN PANGAN DAN HORTIKULTURA');
    } else if (sisaNama.startsWith('ATP')) {
        jurusan = sisaNama.replace('ATP', 'AGRIBISNIS TANAMAN PANGAN');
    }
    
    return { tingkat, jurusan };
}

/**
 * Display report in table
 */
function displayReport() {
    const tbody = document.getElementById('reportTableBody');
    tbody.innerHTML = '';
    
    if (reportData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Tidak ada data untuk periode yang dipilih</td></tr>';
        return;
    }
    
    reportData.forEach((data, index) => {
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td class="fw-bold">${data.nama}</td>
                <td>${data.nisn}</td>
                <td><span class="badge bg-light text-dark border">${data.kelas}</span></td>
                <td><span class="badge status-hadir px-3">${data.hadir}</span></td>
                <td><span class="badge status-sakit px-3">${data.sakit}</span></td>
                <td><span class="badge status-izin px-3">${data.izin}</span></td>
                <td><span class="badge status-alpa px-3">${data.alpa}</span></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

/**
 * Initialize export buttons
 */
function initExportButtons() {
    document.getElementById('btnExportExcel').addEventListener('click', exportToExcel);
    document.getElementById('btnExportPDF').addEventListener('click', exportToPDF);
    document.getElementById('btnPrint').addEventListener('click', printReport);
}

/**
 * Export to Excel
 */
function exportToExcel() {
    if (reportData.length === 0) {
        showError('Tidak ada data untuk diexport');
        return;
    }
    
    try {
        const excelData = reportData.map((data, index) => {
            return {
                'No': index + 1,
                'Nama Siswa': data.nama,
                'NISN': data.nisn,
                'Kelas': data.kelas,
                'Hadir': data.hadir,
                'Sakit': data.sakit,
                'Izin': data.izin,
                'Alpa': data.alpa
            };
        });
        
        const filterMonth = document.getElementById('filterMonth').value;
        const [year, month] = filterMonth.split('-');
        const monthName = new Date(year, month - 1, 1).toLocaleString('id-ID', { month: 'long' });
        
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        
        // Auto-size columns
        const colWidths = [
            { wch: 5 },  // No
            { wch: 30 }, // Nama
            { wch: 15 }, // NISN
            { wch: 15 }, // Kelas
            { wch: 10 }, // Hadir
            { wch: 10 }, // Sakit
            { wch: 10 }, // Izin
            { wch: 10 }  // Alpa
        ];
        worksheet['!cols'] = colWidths;
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Absensi');
        
        const filterKelas = document.getElementById('filterKelas').value;
        const fileName = `Rekap_Absensi_${filterKelas ? filterKelas + '_' : ''}${monthName}_${year}.xlsx`;
        
        XLSX.writeFile(workbook, fileName);
        
    } catch (error) {
        console.error('Export Excel Error:', error);
        showError('Gagal mengexport file Excel');
    }
}

/**
 * Export to PDF
 */
function exportToPDF() {
    if (reportData.length === 0) {
        showError('Tidak ada data untuk diexport');
        return;
    }
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const filterMonth = document.getElementById('filterMonth').value;
        const filterKelas = document.getElementById('filterKelas').value;
        const [year, month] = filterMonth.split('-');
        const monthName = new Date(year, month - 1, 1).toLocaleString('id-ID', { month: 'long' });
        
        const schoolName = document.getElementById('schoolName')?.textContent || 'Sistem Absensi Digital';
        
        // Add header
        doc.setFontSize(16);
        doc.text('REKAPITULASI ABSENSI BULANAN', 105, 15, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(schoolName, 105, 22, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text(`Bulan: ${monthName} ${year}`, 14, 32);
        if (filterKelas) {
            doc.text(`Kelas: ${filterKelas}`, 14, 38);
        }
        
        // Prepare data for autoTable
        const tableData = reportData.map((data, index) => [
            index + 1,
            data.nama,
            data.nisn,
            data.kelas,
            data.hadir,
            data.sakit,
            data.izin,
            data.alpa
        ]);
        
        doc.autoTable({
            startY: filterKelas ? 42 : 36,
            head: [['No', 'Nama Siswa', 'NISN', 'Kelas', 'Hadir', 'Sakit', 'Izin', 'Alpa']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [30, 58, 138] }, // Yayasan Blue
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                2: { cellWidth: 25 },
                4: { cellWidth: 15, halign: 'center' },
                5: { cellWidth: 15, halign: 'center' },
                6: { cellWidth: 15, halign: 'center' },
                7: { cellWidth: 15, halign: 'center' }
            }
        });
        
        const fileName = `Rekap_Absensi_${filterKelas ? filterKelas + '_' : ''}${monthName}_${year}.pdf`;
        doc.save(fileName);
        
    } catch (error) {
        console.error('Export PDF Error:', error);
        showError('Gagal mengexport file PDF');
    }
}

/**
 * Print report
 */
function printReport() {
    if (reportData.length === 0) {
        showError('Tidak ada data untuk dicetak');
        return;
    }
    
    window.print();
}


