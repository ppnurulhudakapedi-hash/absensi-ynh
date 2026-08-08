/**
 * QR Code Generator Module
 * Generate QR Code untuk setiap siswa
 */

checkAuth();

let selectedStudent = null;
let qrCodeInstance = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadStudentList();
    initSearchStudent();
    initDownloadButton();
    initPrintButton();
});

/**
 * Load student list
 */
async function loadStudentList() {
    try {
        const snapshot = await db.collection('students')
            .where('status', '==', 'Aktif')
            .orderBy('nama')
            .get();
        
        const studentList = document.getElementById('studentList');
        studentList.innerHTML = '';
        
        if (snapshot.empty) {
            studentList.innerHTML = '<p class="text-center text-muted">Tidak ada data siswa</p>';
            return;
        }
        
        snapshot.forEach((doc) => {
            const student = { id: doc.id, ...doc.data() };
            const item = document.createElement('div');
            item.className = 'student-list-item';
            item.innerHTML = `
                <h6 class="mb-1">${student.nama}</h6>
                <p class="text-muted mb-0">NISN: ${student.nisn} | Kelas: ${student.kelas}</p>
            `;
            item.addEventListener('click', () => selectStudent(student));
            studentList.appendChild(item);
        });
        
    } catch (error) {
        console.error('Error loading students:', error);
        showError('Gagal memuat data siswa');
    }
}

/**
 * Initialize search student
 */
function initSearchStudent() {
    document.getElementById('searchStudent').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const items = document.querySelectorAll('.student-list-item');
        
        items.forEach((item) => {
            const text = item.textContent.toLowerCase();
            if (text.includes(query)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });
}

/**
 * Select student and generate QR
 */
function selectStudent(student) {
    selectedStudent = student;
    
    // Update active state
    document.querySelectorAll('.student-list-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // Update student info
    document.getElementById('qrStudentName').textContent = student.nama;
    document.getElementById('qrStudentNISN').textContent = student.nisn;
    document.getElementById('qrStudentClass').textContent = student.kelas;
    
    // Generate QR Code
    generateQR(student.nisn);
    
    // Show QR container
    document.getElementById('qrPlaceholder').style.display = 'none';
    document.getElementById('qrContainer').style.display = 'block';
}

/**
 * Generate QR Code
 */
function generateQR(data) {
    const qrcodeDiv = document.getElementById('qrcode');
    qrcodeDiv.innerHTML = '';
    
    qrCodeInstance = new QRCode(qrcodeDiv, {
        text: data,
        width: 300,
        height: 300,
        colorDark: '#1F2937',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
}

/**
 * Initialize download button
 */
function initDownloadButton() {
    document.getElementById('btnDownloadQR').addEventListener('click', () => {
        if (!selectedStudent) return;
        
        try {
            const canvas = document.querySelector('#qrcode canvas');
            if (!canvas) {
                showError('QR Code belum dibuat');
                return;
            }
            
            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `QR_${selectedStudent.nisn}_${selectedStudent.nama}.png`;
            link.href = url;
            link.click();
            
            showSuccess('QR Code berhasil didownload');
            
        } catch (error) {
            console.error('Error downloading QR:', error);
            showError('Gagal mendownload QR Code');
        }
    });
}

/**
 * Initialize print button
 */
function initPrintButton() {
    document.getElementById('btnPrintQR').addEventListener('click', () => {
        if (!selectedStudent) return;
        
        try {
            const canvas = document.querySelector('#qrcode canvas');
            if (!canvas) {
                showError('QR Code belum dibuat');
                return;
            }
            
            const url = canvas.toDataURL('image/png');
            
            // Create print window
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print QR Code - ${selectedStudent.nama}</title>
                    <style>
                        body {
                            font-family: 'Poppins', sans-serif;
                            text-align: center;
                            padding: 40px;
                        }
                        h2 { color: #1F2937; margin-bottom: 10px; }
                        p { color: #6B7280; margin: 5px 0; }
                        img { margin: 30px 0; }
                        @media print {
                            body { padding: 20px; }
                        }
                    </style>
                </head>
                <body>
                    <h2>${selectedStudent.nama}</h2>
                    <p>NISN: ${selectedStudent.nisn}</p>
                    <p>Kelas: ${selectedStudent.kelas}</p>
                    <img src="${url}" alt="QR Code">
                    <script>
                        window.onload = () => {
                            window.print();
                            window.onafterprint = () => window.close();
                        };
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
            
        } catch (error) {
            console.error('Error printing QR:', error);
            showError('Gagal mencetak QR Code');
        }
    });
}


