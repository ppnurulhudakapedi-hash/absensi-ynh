/**
 * Firebase Configuration
 * Konfigurasi koneksi ke Firebase
 */

// TODO: Ganti dengan konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyD7pZk9WmhrioO_D3Qz3nq3ssOC6yp3Rx0",
  authDomain: "absensi-nh.firebaseapp.com",
  projectId: "absensi-nh",
  storageBucket: "absensi-nh.firebasestorage.app",
  messagingSenderId: "427599547520",
  appId: "1:427599547520:web:5a3521d4988251e6dbea65",
  measurementId: "G-T9SPJM2NGN"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();
// Note: Storage tidak digunakan dalam versi ini

// Collections Reference
const studentsRef = db.collection('students');
const attendanceRef = db.collection('attendance');
const adminsRef = db.collection('admins');
const settingsRef = db.collection('settings');

/**
 * Enable offline persistence
 */
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code == 'unimplemented') {
            console.log('The current browser does not support persistence.');
        }
    });

console.log('Firebase initialized successfully');


