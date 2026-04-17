import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { LogOut, UserCircle } from 'lucide-react';
import bayportLogo from '../public/Bayport-Financial-Services-Logo-2.png';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Toaster } from './components/ui/sonner';
import { User } from './types/loan';
import { DashboardMetrics } from './components/DashboardMetrics';
import { ApproverDashboard } from './components/ApproverDashboard';
import { WorkQueue } from './components/WorkQueue';
import { SupervisorView } from './components/SupervisorView';
import { LoginScreen } from './components/LoginScreen';
import { auth, isFirebaseConfigured } from './lib/firebase';
import { ApiError, fetchCurrentUserProfile } from './lib/api';
import { getApprovedPersonnelByEmail } from './config/approvedPersonnel';
import {
  setAuthFromSession,
  setAuthInitialized,
  signOutUser,
} from './store/authSlice';
import { useAppDispatch, useAppSelector } from './store/hooks';

export default function App() {
  const dispatch = useAppDispatch();
  const { user: authenticatedUser, initialized } = useAppSelector((state) => (state as any).auth);
  const [backendUser, setBackendUser] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const currentUser = useMemo<User | null>(() => {
    if (backendUser) {
      return backendUser;
    }

    if (!authenticatedUser) {
      return null;
    }

    return {
      id: authenticatedUser.uid,
      name: authenticatedUser.displayName,
      role: authenticatedUser.role,
    };
  }, [backendUser, authenticatedUser]);

  // Phase 1: Initialize Firebase auth state
  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      dispatch(setAuthInitialized(true));
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        dispatch(setAuthFromSession(null));
        dispatch(setAuthInitialized(true));
        return;
      }

      const approvedPersonnel = getApprovedPersonnelByEmail(firebaseUser.email);
      if (!approvedPersonnel || !firebaseUser.email) {
        if (auth) {
          await signOut(auth);
        }
        dispatch(setAuthFromSession(null));
        dispatch(setAuthInitialized(true));
        return;
      }

      dispatch(
        setAuthFromSession({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: approvedPersonnel.name,
          role: approvedPersonnel.role,
        }),
      );
      dispatch(setAuthInitialized(true));
    });

    return unsubscribe;
  }, [dispatch]);

  // Phase 2: Load backend user profile with delay to ensure Firebase is ready
  useEffect(() => {
    if (!initialized || !authenticatedUser) {
      setBackendUser(null);
      setProfileLoading(false);
      setProfileError(null);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError(null);

      try {
        const profile = await fetchCurrentUserProfile();
        if (!cancelled) {
          setBackendUser(profile);
        }
      } catch (caughtError: unknown) {
        if (cancelled) {
          return;
        }

        if (caughtError instanceof ApiError && caughtError.status === 401) {
          return;
        }

        setBackendUser(null);
        setProfileError(caughtError instanceof Error ? caughtError.message : 'Unable to load your profile from the backend.');
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    // Add delay to ensure Firebase session is fully persisted and auth.currentUser is set
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        void loadProfile();
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [authenticatedUser, initialized]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-blue-700">
        Loading authentication...
      </div>
    );
  }

  if (!authenticatedUser || !currentUser) {
    return (
      <>
        <Toaster />
        <LoginScreen />
      </>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(5,128,255,0.14),transparent_42%),radial-gradient(circle_at_86%_18%,rgba(23,94,255,0.1),transparent_40%),linear-gradient(180deg,#ffffff_0%,#f4f8ff_100%)]" />
        <div className="absolute -top-28 left-[-8%] h-72 w-72 rounded-full bg-sky-300/30 blur-3xl" />
        <div className="absolute -right-16 bottom-6 h-64 w-64 rounded-full bg-blue-300/30 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col">
        <div className="border-b border-sky-200 bg-white/50 px-6 py-3 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={bayportLogo} alt="Bayport" className="h-8 w-auto" />
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Final Approver Interface</h1>
                <p className="text-xs text-slate-500">{currentUser.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800">
                <UserCircle className="h-3.5 w-3.5" />
                {currentUser.role}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch(signOutUser())}
                className="gap-2 text-slate-600 hover:text-slate-900"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            {profileError && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6 text-sm text-amber-800">{profileError}</CardContent>
              </Card>
            )}

            {currentUser.role === 'Final Approver' && (
              <>
                <DashboardMetrics />
                <ApproverDashboard currentUser={currentUser} />
              </>
            )}

            {currentUser.role === 'Disbursement Officer' && <WorkQueue currentUser={currentUser} />}

            {currentUser.role === 'Supervisor' && (
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="capacity">Officer Capacity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <DashboardMetrics />
                </TabsContent>

                <TabsContent value="capacity">
                  <SupervisorView />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>

      <Toaster />
    </div>
  );
}
