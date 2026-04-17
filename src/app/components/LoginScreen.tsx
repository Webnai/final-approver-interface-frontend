import { FormEvent, useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import bayportLogo from '@/public/Bayport-Financial-Services-Logo-2.png';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { clearAuthError, signInUser } from '@/app/store/authSlice';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { isFirebaseConfigured } from '@/app/lib/firebase';

export function LoginScreen() {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await dispatch(signInUser({ email: email.trim(), password }));
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(5,128,255,0.16),transparent_40%),radial-gradient(circle_at_85%_25%,rgba(23,94,255,0.12),transparent_38%),linear-gradient(180deg,#ffffff_0%,#f3f9ff_100%)]" />
        <div className="absolute -top-28 left-[-8%] h-72 w-72 rounded-full bg-sky-300/35 blur-3xl" />
        <div className="absolute -right-16 bottom-6 h-64 w-64 rounded-full bg-blue-300/30 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-5 py-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="hidden flex-col justify-center rounded-3xl border border-blue-100 bg-white p-10 shadow-[0_30px_80px_-40px_rgba(12,74,153,0.38)] lg:flex">
            <img src={bayportLogo} alt="Bayport" className="h-16 w-auto object-contain" />
            <h1 className="mt-10 text-4xl font-semibold leading-tight text-slate-900">
              Final Approver Interface
            </h1>
            <p className="mt-4 max-w-lg text-base text-slate-600">
              Secure operational workspace for disbursement approvals, queue ownership, and supervisory review.
            </p>

            <div className="mt-10 rounded-2xl border border-sky-200 bg-sky-50 p-5">
              <p className="text-sm text-sky-900">
                Access is restricted to approved personnel only. New account registration is disabled for this system.
              </p>
            </div>
          </section>

          <Card className="border border-blue-100 bg-white text-slate-900 shadow-[0_24px_70px_-45px_rgba(8,63,146,0.58)]">
            <CardHeader className="space-y-3">
              <img src={bayportLogo} alt="Bayport" className="h-12 w-auto object-contain lg:hidden" />
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                Authorized Staff Sign-In
              </div>
              <CardTitle className="text-2xl font-semibold">Sign in to continue</CardTitle>
              <CardDescription className="text-slate-600">
                Enter your Bayport credentials to access the approval dashboard.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!isFirebaseConfigured && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Firebase is not configured. Add VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN,
                  VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID to your .env file.
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-800">Work Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@bayport.com"
                    required
                    className="border-blue-100 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-800">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      className="border-blue-100 bg-white pr-10 text-slate-900 focus-visible:ring-blue-300"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full bg-blue-600 text-white hover:bg-blue-500"
                  disabled={isLoading || !isFirebaseConfigured}
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
