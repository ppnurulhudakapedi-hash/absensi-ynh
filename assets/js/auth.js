/**
 * Authentication Module
 * Menangani proses login dan autentikasi
 */

// Check if user is already logged in
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in, redirect to dashboard
        window.location.href = 'dashboard.html';
    }
});

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMeElement = document.getElementById('rememberMe');
    const rememberMe = rememberMeElement ? rememberMeElement.checked : true;
    
    // Show loading
    showLoading('Memproses login...');
    
    try {
        // Sign in with Firebase Authentication
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Get admin data from Firestore
        const adminDoc = await db.collection('admins').doc(user.uid).get();
        
        if (!adminDoc.exists) {
            throw new Error('Data admin tidak ditemukan');
        }
        
        const adminData = adminDoc.data();
        
        // Check if admin is active
        if (adminData.status !== 'Aktif') {
            await auth.signOut();
            throw new Error('Akun Anda tidak aktif. Hubungi administrator.');
        }
        
        // Set persistence based on remember me
        if (rememberMe) {
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        } else {
            await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
        }
        
        // Update last login
        await db.collection('admins').doc(user.uid).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Success
        Swal.fire({
            icon: 'success',
            title: 'Login Berhasil!',
            text: `Selamat datang, ${adminData.nama}`,
            confirmButtonColor: '#7C3AED',
            timer: 1500
        }).then(() => {
            window.location.href = 'dashboard.html';
        });
        
    } catch (error) {
        console.error('Login error:', error);
        
        let errorMessage = 'Terjadi kesalahan saat login';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'Email tidak terdaftar';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Password salah';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Format email tidak valid';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Terlalu banyak percobaan. Coba lagi nanti.';
                break;
            default:
                errorMessage = error.message;
        }
        
        Swal.fire({
            icon: 'error',
            title: 'Login Gagal',
            text: errorMessage,
            confirmButtonColor: '#EF4444'
        });
    }
});


