// Firebase utility functions for error handling and common operations

export const getFirebaseErrorMessage = (error) => {
  switch (error.code) {
    // Authentication errors
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/email-already-in-use':
      return 'Email already registered. Please use a different email or try logging in.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Please contact support.';
    case 'auth/invalid-credential':
      return 'Invalid credentials. Please check your email and password.';
    
    // Firestore errors
    case 'permission-denied':
      return 'You do not have permission to perform this action.';
    case 'unavailable':
      return 'Service temporarily unavailable. Please try again.';
    case 'deadline-exceeded':
      return 'Request timed out. Please try again.';
    case 'resource-exhausted':
      return 'Service quota exceeded. Please try again later.';
    
    // Storage errors
    case 'storage/unauthorized':
      return 'You do not have permission to access this file.';
    case 'storage/canceled':
      return 'Upload was canceled.';
    case 'storage/unknown':
      return 'An unknown error occurred during upload.';
    case 'storage/invalid-checksum':
      return 'File upload failed due to corruption. Please try again.';
    case 'storage/retry-limit-exceeded':
      return 'Upload failed after multiple attempts. Please try again.';
    case 'storage/invalid-event-name':
      return 'Invalid upload event.';
    case 'storage/invalid-url':
      return 'Invalid file URL.';
    case 'storage/invalid-argument':
      return 'Invalid upload argument.';
    case 'storage/no-default-bucket':
      return 'No default storage bucket configured.';
    case 'storage/cannot-slice-blob':
      return 'File cannot be sliced for upload.';
    case 'storage/server-file-wrong-size':
      return 'Server file size does not match upload.';
    
    default:
      return error.message || 'An unexpected error occurred.';
  }
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const formatFirebaseTimestamp = (timestamp) => {
  if (!timestamp) return '';
  
  if (timestamp.toDate) {
    return timestamp.toDate().toLocaleString();
  }
  
  if (timestamp instanceof Date) {
    return timestamp.toLocaleString();
  }
  
  return new Date(timestamp).toLocaleString();
};

export const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const sanitizeFileName = (fileName) => {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
};

export const getFileExtension = (fileName) => {
  return fileName.split('.').pop().toLowerCase();
};

export const isImageFile = (fileName) => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
  const extension = getFileExtension(fileName);
  return imageExtensions.includes(extension);
};

export const isDocumentFile = (fileName) => {
  const documentExtensions = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
  const extension = getFileExtension(fileName);
  return documentExtensions.includes(extension);
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
