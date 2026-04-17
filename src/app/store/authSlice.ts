import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { getApprovedPersonnelByEmail } from '@/app/config/approvedPersonnel';
import { auth, isFirebaseConfigured } from '@/app/lib/firebase';
import { UserRole } from '@/app/types/loan';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  initialized: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isLoading: false,
  initialized: false,
  error: null,
};

function mapFirebaseUser(firebaseUser: User): AuthUser | null {
  const approvedUser = getApprovedPersonnelByEmail(firebaseUser.email);
  if (!approvedUser || !firebaseUser.email) {
    return null;
  }

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: approvedUser.name,
    role: approvedUser.role,
  };
}

export const signInUser = createAsyncThunk<
  AuthUser,
  { email: string; password: string },
  { rejectValue: string }
>('auth/signInUser', async ({ email, password }, { rejectWithValue }) => {
  if (!isFirebaseConfigured || !auth) {
    return rejectWithValue('Firebase is not configured. Add VITE_FIREBASE_* variables before sign in.');
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const mappedUser = mapFirebaseUser(credential.user);

    if (!mappedUser) {
      await signOut(auth);
      return rejectWithValue('Access denied. Only approved personnel can access this system.');
    }

    return mappedUser;
  } catch {
    return rejectWithValue('Unable to sign in. Verify your credentials and try again.');
  }
});

export const signOutUser = createAsyncThunk('auth/signOutUser', async () => {
  if (auth) {
    await signOut(auth);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthFromSession(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
      state.error = null;
    },
    setAuthInitialized(state, action: PayloadAction<boolean>) {
      state.initialized = action.payload;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signInUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(signInUser.rejected, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.error = action.payload ?? 'Unable to sign in.';
      })
      .addCase(signOutUser.fulfilled, (state) => {
        state.user = null;
        state.error = null;
      });
  },
});

export const { setAuthFromSession, setAuthInitialized, clearAuthError } = authSlice.actions;

export default authSlice.reducer;
