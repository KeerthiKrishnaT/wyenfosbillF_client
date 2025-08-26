import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Function to record automatic punch-in
const recordAutomaticPunchIn = async (user, userProfile) => {
  try {
    const idToken = await user.getIdToken(true);
    const headers = { Authorization: `Bearer ${idToken}` };
    
    // First check if user already has an active session
    try {
      const currentStatusRes = await axios.get('http://localhost:5000/api/punching-times/current', { headers });
      if (currentStatusRes.data) {

        return; // User already punched in
      }
    } catch (statusErr) {
      // If error, proceed with punch-in
      
    }
    
    await axios.post(
      'http://localhost:5000/api/punching-times/record-login',
      {
        email: user.email,
        role: userProfile?.role || 'user',
        name: userProfile?.name || userProfile?.displayName || user.displayName || 'Unknown User'
      },
      { headers }
    );
    
  } catch (error) {
    console.error('❌ Failed to record automatic punch-in:', error);
    // Don't throw error to avoid breaking login flow
  }
};

// Function to record automatic punch-out
const recordAutomaticPunchOut = async (user) => {
  try {
    const idToken = await user.getIdToken(true);
    const headers = { Authorization: `Bearer ${idToken}` };
    
    await axios.post(
      'http://localhost:5000/api/punching-times/record-logout',
      {
        email: user.email
      },
      { headers }
    );
    
  } catch (error) {
    console.error('❌ Failed to record automatic punch-out:', error);
    // Don't throw error to avoid breaking logout flow
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up with email and password
  const signup = async (email, password, userData) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update user profile
      await updateProfile(result.user, {
        displayName: userData.displayName || userData.name,
        photoURL: userData.photoURL
      });

      // Save additional user data to Firestore
      await setDoc(doc(db, 'users', result.user.uid), {
        ...userData,
        email,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isActive: true
      });

      return result;
    } catch (error) {
      throw error;
    }
  };

  // Sign in with email and password
  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      // Ensure we have a fresh ID token for backend verification
      const idToken = await result.user.getIdToken(true);
      
      // Update last login time
      await updateDoc(doc(db, 'users', result.user.uid), {
        lastLogin: new Date().toISOString()
      });

      // Get user profile for punch-in recording
      const profile = await getUserProfile(result.user.uid);
      
      // Record automatic punch-in
      await recordAutomaticPunchIn(result.user, profile);

      return { ...result, idToken };
    } catch (error) {
      throw error;
    }
  };

// Sign in with Google
const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const res = await signInWithPopup(auth, provider);
    const idToken = await res.user.getIdToken(true);
    
    // Get user profile for punch-in recording
    const profile = await getUserProfile(res.user.uid);
    
    // Record automatic punch-in
    await recordAutomaticPunchIn(res.user, profile);
    
    return { ...res, idToken };
  } catch (error) {
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider);
      // getRedirectResult should be handled after redirect on app load if needed
      return null;
    }
    throw error;
  }
};

  const logout = async () => {
    try {
      // Record automatic punch-out before signing out
      if (currentUser) {
        await recordAutomaticPunchOut(currentUser);
      }
      
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error;
    }
  };

  // Get user profile from Firestore
  const getUserProfile = async (uid) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  };

  // Update user profile
  const updateUserProfile = async (uid, updates) => {
    try {
      await updateDoc(doc(db, 'users', uid), updates);
      // Refresh user profile
      const updatedProfile = await getUserProfile(uid);
      setUserProfile(updatedProfile);
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Get user profile from Firestore
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
        
        // Record automatic punch-in for new sessions
        // Only record if this is a fresh login (not just page refresh)
        const lastLogin = profile?.lastLogin;
        const now = new Date();
        const timeDiff = now - new Date(lastLogin || 0);
        
        // If last login was more than 5 minutes ago, consider it a new session
        if (!lastLogin || timeDiff > 5 * 60 * 1000) {
          await recordAutomaticPunchIn(user, profile);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await getRedirectResult(auth);
        if (res?.user) {
          const user = res.user;
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (!userDoc.exists()) {
            await setDoc(doc(db, 'users', user.uid), {
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              isActive: true
            });
          } else {
            await updateDoc(doc(db, 'users', user.uid), {
              lastLogin: new Date().toISOString()
            });
          }
          
          // Record automatic punch-in for Google redirect
          const profile = await getUserProfile(user.uid);
          await recordAutomaticPunchIn(user, profile);
        }
      } catch (e) {
        console.error('Google redirect sign-in error:', e);
      }
    })();
  }, []);

  // Handle page unload/close to record punch-out
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (currentUser) {
        try {
          await recordAutomaticPunchOut(currentUser);
        } catch (error) {
          console.error('Failed to record punch-out on page unload:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  const value = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    logout,
    resetPassword,
    signInWithGoogle,
    updateUserProfile,
    getUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
