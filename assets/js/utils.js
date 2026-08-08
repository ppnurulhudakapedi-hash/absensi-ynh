/**
 * Utility Functions
 * Fungsi-fungsi helper untuk aplikasi
 */

/**
 * Check if user is authenticated
 * Redirect to login if not authenticated
 */
function checkAuth() {
    firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = 'index.html';
        }
    });
}

/**
 * Logout function
 */
function logout() {
    Swal.fire({
        title: 'Konfirmasi Logout',
        text: 'Apakah Anda yakin ingin keluar?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#7C3AED',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Ya, Keluar',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            auth.signOut().then(() => {
                window.location.href = 'index.html';
            });
        }
    });
}

/**
 * Format date to Indonesian format
 */
function formatDate(date) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    const d = new Date(date);
    const dayName = days[d.getDay()];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    
    return `${dayName}, ${day} ${month} ${year}`;
}

/**
 * Format time to HH:MM
 */
function formatTime(date) {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Show loading Swal
 */
function showLoading(message = 'Mohon tunggu...') {
    Swal.fire({
        title: message,
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
}

/**
 * Show success message
 */
function showSuccess(message) {
    Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: message,
        confirmButtonColor: '#7C3AED'
    });
}

/**
 * Show error message
 */
function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: message,
        confirmButtonColor: '#EF4444'
    });
}

/**
 * Toggle sidebar for mobile
 */
function initSidebarToggle() {
    const toggleBtn = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            
            // Prevent body scroll when sidebar is open (mobile only)
            if (sidebar.classList.contains('active')) {
                document.body.classList.add('sidebar-open');
                document.body.style.overflow = 'hidden';
            } else {
                document.body.classList.remove('sidebar-open');
                document.body.style.overflow = '';
            }
        });
        
        // Close sidebar when clicking outside (mobile only)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (sidebar.classList.contains('active') && 
                    !sidebar.contains(e.target) && 
                    !toggleBtn.contains(e.target)) {
                    sidebar.classList.remove('active');
                    document.body.classList.remove('sidebar-open');
                    document.body.style.overflow = '';
                }
            }
        });
    }
}

/**
 * Initialize logout button
 */
function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}

// Initialize common functions
document.addEventListener('DOMContentLoaded', () => {
    initSidebarToggle();
    initLogout();
});


