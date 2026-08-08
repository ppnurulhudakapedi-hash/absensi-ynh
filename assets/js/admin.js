/**
 * Admin Management Module
 * CRUD untuk manajemen admin
 */

checkAuth();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadAdmins();
    initAddButton();
    initForm();
});

/**
 * Load all admins
 */
async function loadAdmins() {
    try {
        showLoading('Memuat data admin...');
        
        const snapshot = await db.collection('admins').get();
        
        const tbody = document.getElementById('adminTable');
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Tidak ada data admin</td></tr>';
            Swal.close();
            return;
        }
        
        snapshot.forEach((doc) => {
            const admin = { id: doc.id, ...doc.data() };
            const row = `
                <tr>
                    <td>${admin.email}</td>
                    <td>${admin.nama}</td>
                    <td><span class="badge ${admin.role === 'Super Admin' ? 'badge-danger' : 'badge-info'}">${admin.role}</span></td>
                    <td><span class="badge ${admin.status === 'Aktif' ? 'badge-success' : 'badge-danger'}">${admin.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-warning" onclick="changeCredentials('${admin.id}', '${admin.email}')">
                            <i class="bi bi-key"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="editAdmin('${admin.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteAdmin('${admin.id}', '${admin.nama}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
        
        Swal.close();
        
    } catch (error) {
        console.error('Error loading admins:', error);
        showError('Gagal memuat data admin');
    }
}

/**
 * Initialize add button
 */
function initAddButton() {
    document.getElementById('btnAddAdmin').addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'Tambah Admin';
        document.getElementById('adminForm').reset();
        document.getElementById('adminId').value = '';
        document.getElementById('adminPassword').required = true;
        const modal = new bootstrap.Modal(document.getElementById('adminModal'));
        modal.show();
    });
}

/**
 * Edit admin
 */
async function editAdmin(id) {
    try {
        const doc = await db.collection('admins').doc(id).get();
        if (!doc.exists) {
            showError('Data admin tidak ditemukan');
            return;
        }
        
        const admin = doc.data();
        
        document.getElementById('modalTitle').textContent = 'Edit Admin';
        document.getElementById('adminId').value = id;
        document.getElementById('adminEmail').value = admin.email;
        document.getElementById('adminEmail').disabled = true;
        document.getElementById('adminName').value = admin.nama;
        document.getElementById('adminRole').value = admin.role;
        document.getElementById('adminPassword').required = false;
        document.getElementById('adminPassword').placeholder = 'Kosongkan jika tidak diubah';
        
        const modal = new bootstrap.Modal(document.getElementById('adminModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error editing admin:', error);
        showError('Gagal memuat data admin');
    }
}

/**
 * Delete admin
 */
async function deleteAdmin(id, nama) {
    const result = await Swal.fire({
        title: 'Konfirmasi Hapus',
        text: `Hapus admin ${nama}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
    });
    
    if (result.isConfirmed) {
        try {
            showLoading('Menghapus admin...');
            
            // Delete from Firestore
            await db.collection('admins').doc(id).delete();
            
            // Note: Cannot delete Firebase Auth user from client
            // This should be done from Admin SDK on server side
            
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: 'Admin telah dihapus',
                confirmButtonColor: '#7C3AED'
            });
            
            loadAdmins();
            
        } catch (error) {
            console.error('Error deleting admin:', error);
            showError('Gagal menghapus admin');
        }
    }
}

/**
 * Initialize form
 */
function initForm() {
    document.getElementById('adminForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('adminId').value;
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        const nama = document.getElementById('adminName').value;
        const role = document.getElementById('adminRole').value;
        
        try {
            showLoading('Menyimpan data...');
            
            if (id) {
                // Update existing admin
                const updateData = {
                    nama: nama,
                    role: role,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                await db.collection('admins').doc(id).update(updateData);
                
                // Update password if provided
                if (password) {
                    // Note: Cannot update password from client
                    // This should be done from Admin SDK on server side
                    console.log('Password update requires Admin SDK');
                }
                
            } else {
                // Create new admin
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // Save to Firestore
                await db.collection('admins').doc(user.uid).set({
                    email: email,
                    nama: nama,
                    role: role,
                    status: 'Aktif',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: 'Data admin telah disimpan',
                confirmButtonColor: '#7C3AED'
            });
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
            modal.hide();
            
            // Reset form
            document.getElementById('adminEmail').disabled = false;
            document.getElementById('adminPassword').required = true;
            document.getElementById('adminPassword').placeholder = '';
            
            loadAdmins();
            
        } catch (error) {
            console.error('Error saving admin:', error);
            
            let errorMessage = 'Gagal menyimpan data admin';
            
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Email sudah digunakan';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password terlalu lemah (min 6 karakter)';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Format email tidak valid';
            }
            
            showError(errorMessage);
        }
    });
}

// Make functions global
window.editAdmin = editAdmin;
window.deleteAdmin = deleteAdmin;
window.changeCredentials = changeCredentials;

/**
 * Change email or password
 */
function changeCredentials(id, email) {
    Swal.fire({
        title: 'Ubah Email atau Password',
        html: `
            <div class="row g-3" style="text-align: left;">
                <div>
                    <label class="form-label">Pilih yang ingin diubah:</label>
                    <div>
                        <input type="radio" id="changeEmail" name="changeType" value="email">
                        <label for="changeEmail" style="display: inline; margin-right: 20px;">Email</label>
                        <input type="radio" id="changePassword" name="changeType" value="password">
                        <label for="changePassword" style="display: inline;">Password</label>
                    </div>
                </div>
                <div id="emailInput" style="display: none;">
                    <label class="form-label">Email Baru:</label>
                    <input type="email" class="form-control" id="newEmail" placeholder="Masukkan email baru">
                </div>
                <div id="passwordInput" style="display: none;">
                    <label class="form-label">Password Baru:</label>
                    <input type="password" class="form-control" id="newPassword" placeholder="Password minimal 6 karakter">
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#7C3AED',
        didOpen: () => {
            document.getElementById('changeEmail').addEventListener('change', () => {
                document.getElementById('emailInput').style.display = 'block';
                document.getElementById('passwordInput').style.display = 'none';
            });
            document.getElementById('changePassword').addEventListener('change', () => {
                document.getElementById('passwordInput').style.display = 'block';
                document.getElementById('emailInput').style.display = 'none';
            });
        },
        preConfirm: () => {
            const changeType = document.querySelector('input[name="changeType"]:checked');
            if (!changeType) {
                Swal.showValidationMessage('Pilih email atau password');
                return false;
            }
            
            if (changeType.value === 'email') {
                const newEmail = document.getElementById('newEmail').value;
                if (!newEmail) {
                    Swal.showValidationMessage('Masukkan email baru');
                    return false;
                }
                return { type: 'email', value: newEmail, id: id };
            } else {
                const newPassword = document.getElementById('newPassword').value;
                if (!newPassword || newPassword.length < 6) {
                    Swal.showValidationMessage('Password minimal 6 karakter');
                    return false;
                }
                return { type: 'password', value: newPassword, id: id };
            }
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            await updateCredentials(result.value);
        }
    });
}

/**
 * Update email or password
 */
async function updateCredentials(data) {
    try {
        showLoading(`Mengubah ${data.type === 'email' ? 'email' : 'password'}...`);
        
        if (data.type === 'email') {
            // Update email di Authentication
            await auth.currentUser.updateEmail(data.value);
            
            // Update email di Firestore
            await db.collection('admins').doc(data.id).update({
                email: data.value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showSuccess('Email berhasil diubah');
        } else {
            // Update password di Authentication
            await auth.currentUser.updatePassword(data.value);
            
            // Update timestamp di Firestore
            await db.collection('admins').doc(data.id).update({
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showSuccess('Password berhasil diubah');
        }
        
        loadAdmins();
        
    } catch (error) {
        console.error('Error updating credentials:', error);
        
        let errorMessage = 'Gagal mengubah data';
        
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email sudah digunakan';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password terlalu lemah';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Format email tidak valid';
        } else if (error.code === 'auth/requires-recent-login') {
            errorMessage = 'Silakan logout dan login kembali terlebih dahulu';
        }
        
        showError(errorMessage);
    }
}


