/**
 * Dashboard Module
 * Menampilkan statistik dan grafik kehadiran
 */

// Check authentication
let dailyChart, weeklyChart, monthlyChart;

// Initialize dashboard on load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadDashboardData();
});

/**
 * Load all dashboard data
 */
async function loadDashboardData() {
    try {
        // Get current user info
        const user = auth.currentUser;
        if (user) {
            const adminDoc = await db.collection('admins').doc(user.uid).get();
            if (adminDoc.exists) {
                const adminData = adminDoc.data();
                if (document.getElementById('adminName')) document.getElementById('adminName').textContent = adminData.nama;
                if (document.getElementById('adminRole')) document.getElementById('adminRole').textContent = adminData.role;
                if (document.getElementById('welcomeName')) document.getElementById('welcomeName').textContent = adminData.nama;
            }
        }
        
        // Get school settings
        const settingsDoc = await db.collection('settings').doc('school').get();
        if (settingsDoc.exists) {
            const settings = settingsDoc.data();
            if (document.getElementById('schoolName')) document.getElementById('schoolName').textContent = settings.name || 'Sekolah';
        }
        
        // Display current date
        const today = new Date();
        if (document.getElementById('currentDate')) document.getElementById('currentDate').textContent = formatDate(today);
        if (document.getElementById('bannerDate')) document.getElementById('bannerDate').textContent = formatDate(today);
        
        // Load statistics
        await loadStatistics();
        
        // Load recent activity
        await loadRecentActivity();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Gagal memuat data dashboard');
    }
}

/**
 * Load statistics
 */
async function loadStatistics() {
    const todayDate = getTodayDate();
    
    try {
        // Total students
        const studentsSnapshot = await db.collection('students')
            .where('status', '==', 'Aktif')
            .get();
        const activeStudentNisns = new Set();
        studentsSnapshot.forEach(doc => {
            activeStudentNisns.add(doc.data().nisn);
        });

        const totalStudents = studentsSnapshot.size;
        document.getElementById('totalStudents').textContent = totalStudents;
        
        // Today's attendance
        const attendanceSnapshot = await db.collection('attendance')
            .where('tanggal', '==', todayDate)
            .get();
        
        let hadir = 0, sakit = 0, izin = 0, alpa = 0;
        const studentStatusMap = {};
        
        // Map per student to get the final status of the day
        attendanceSnapshot.forEach((doc) => {
            const data = doc.data();
            const nisn = data.nisn;
            
            // Hanya hitung siswa yang saat ini berstatus Aktif
            if (!activeStudentNisns.has(nisn)) return;
            
            if (!studentStatusMap[nisn]) {
                studentStatusMap[nisn] = 'Belum Absen';
            }
            
            // Jika ada manual input (Alpa/Sakit/Izin/Hadir tanpa scan masuk/pulang)
            if (!data.jenisAbsensi || data.jenisAbsensi === 'Manual') {
                // Jangan timpa status yang sudah pasti (kecuali dari Belum Absen)
                if (studentStatusMap[nisn] === 'Belum Absen') {
                    studentStatusMap[nisn] = data.statusKehadiran || data.statusWaktu || 'Hadir';
                }
            } 
            // Jika ada scan Masuk atau Pulang, otomatis Hadir
            else if (data.jenisAbsensi === 'Masuk' || data.jenisAbsensi === 'Pulang' || data.jenisAbsensi === 'Absen Masuk' || data.jenisAbsensi === 'Absen Pulang') {
                if (studentStatusMap[nisn] === 'Belum Absen') {
                    studentStatusMap[nisn] = 'Hadir';
                }
            }
            
            // Override if document specifically sets a different status
            if (data.statusKehadiran && data.statusKehadiran !== 'Belum Absen' && data.statusKehadiran !== 'Hadir') {
                studentStatusMap[nisn] = data.statusKehadiran;
            }
        });
        
        // Count statuses
        for (const nisn in studentStatusMap) {
            const status = studentStatusMap[nisn];
            if (status === 'Hadir') hadir++;
            else if (status === 'Sakit') sakit++;
            else if (status === 'Izin') izin++;
            else if (status === 'Alpa') alpa++;
        }
        
        const totalBelumAbsen = Math.max(0, totalStudents - hadir - sakit - izin - alpa);
        
        document.getElementById('totalPresent').textContent = hadir;
        document.getElementById('totalSakit').textContent = sakit;
        document.getElementById('totalIzin').textContent = izin;
        if (document.getElementById('totalAlpa')) document.getElementById('totalAlpa').textContent = alpa;
        
        // Update Chart directly with data
        const dailyCtx = document.getElementById('dailyChart');
        if (dailyCtx) {
            if (dailyChart) {
                dailyChart.destroy();
            }
            dailyChart = new Chart(dailyCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['Hadir', 'Sakit', 'Izin', 'Alpa', 'Belum Absen'],
                    datasets: [{
                        label: 'Statistik Kehadiran',
                        data: [hadir, sakit, izin, alpa, totalBelumAbsen],
                        backgroundColor: [
                            '#10B981', // Hadir
                            '#F59E0B', // Sakit
                            '#3B82F6', // Izin
                            '#EF4444', // Alpa
                            '#94A3B8'  // Belum Absen
                        ],
                        borderRadius: 6,
                        barThickness: 40
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { precision: 0 } // ensure integer steps
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}



/**
 * Load recent activity
 */
async function loadRecentActivity() {
    const todayDate = getTodayDate();
    
    try {
        // Remove orderBy and limit from the query to avoid composite index requirement
        const snapshot = await db.collection('attendance')
            .where('tanggal', '==', todayDate)
            .get();
        
        const tbody = document.getElementById('recentActivityTable');
        if (!tbody) return; // Exit if element doesn't exist

        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Belum ada data absensi hari ini</td></tr>';
            return;
        }
        
        // Sort data manually in javascript (descending by timestamp)
        let activities = [];
        snapshot.forEach((doc) => {
            activities.push(doc.data());
        });
        
        activities.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());
        
        // Get only the 10 most recent activities
        const recentActivities = activities.slice(0, 10);
        
        recentActivities.forEach((data) => {
            const row = `
                <tr>
                    <td>${formatTime(data.timestamp.toDate())}</td>
                    <td>${data.nisn}</td>
                    <td>${data.nama}</td>
                    <td>${data.kelas}</td>
                    <td>${data.jenisAbsensi}</td>
                    <td><span class="badge ${data.statusWaktu === 'Tepat Waktu' ? 'badge-success' : 'badge-warning'}">${data.statusWaktu}</span></td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}




