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

    void loadProfile();

    return () => {
      cancelled = true;
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
        <div className="absolute -right-20 bottom-12 h-64 w-64 rounded-full bg-blue-300/25 blur-3xl" />
      </div>
      <Toaster />

      <header className="sticky top-0 z-20 border-b border-blue-100 bg-white/85 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={bayportLogo} alt="Bayport" className="h-10 w-auto object-contain" />
              <div>
                <h1 className="text-2xl font-bold">Loan Disbursement System</h1>
                <p className="text-sm text-muted-foreground">Backend-driven workflow management</p>
              </div>
            </div>

            <Card className="w-full max-w-sm border-blue-100 bg-white/90">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <UserCircle className="h-10 w-10 text-blue-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium leading-none">{currentUser.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{currentUser.role}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{authenticatedUser.email}</p>
                    {profileLoading && <p className="mt-1 text-xs text-blue-600">Syncing profile...</p>}
                    {profileError && <p className="mt-1 text-xs text-amber-700">{profileError}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Sign out"
                    onClick={() => {
                      dispatch(signOutUser());
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-6 py-8">
        <div className="space-y-6">
          <DashboardMetrics />

          {currentUser.role === 'Final Approver' && (
            <ApproverDashboard currentUser={currentUser} />
          )}

          {currentUser.role === 'Disbursement Officer' && (
            <WorkQueue currentUser={currentUser} />
          )}

          {currentUser.role === 'Supervisor' && (
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview">Officer Overview</TabsTrigger>
                <TabsTrigger value="queue">Full Queue</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <SupervisorView />
              </TabsContent>

              <TabsContent value="queue">
                <WorkQueue currentUser={currentUser} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
}
