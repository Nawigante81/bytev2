import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import PageTransition from '@/components/PageTransition';

const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [signupInfo, setSignupInfo] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, signUp, signInWithOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/panel';

  const [isIOSInApp, setIsIOSInApp] = useState(false);
  useEffect(() => {
    try {
      const ua = navigator.userAgent || navigator.vendor || window.opera || '';
      const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const inApp = /(FBAN|FBAV|Instagram|Twitter|TikTok|Snapchat|Pinterest|DuckDuckGo)/i.test(ua);
      setIsIOSInApp(Boolean(isIOS && inApp));
    } catch (_) {
      setIsIOSInApp(false);
    }
  }, []);

  const handleSignIn = async () => {
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    if (!error) {
      navigate(from, { replace: true });
    }
    setIsSubmitting(false);
  };

  const handleSignUp = async () => {
    setFormError('');
    setSignupInfo('');
    if (!email || !password || !confirmPassword) {
      setFormError('Wypełnij e‑mail i oba pola hasła.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Hasła nie są identyczne.');
      return;
    }
    if (password.length < 6) {
      setFormError('Hasło musi mieć co najmniej 6 znaków.');
      return;
    }
    setIsSubmitting(true);
    const { error } = await signUp(email, password);
    setIsSubmitting(false);
    if (!error) {
      setSignupInfo('Rejestracja rozpoczęta. Sprawdź swoją skrzynkę e‑mail i potwierdź adres, aby dokończyć zakładanie konta. Po potwierdzeniu będziesz mógł się zalogować.');
      setPassword('');
      setConfirmPassword('');
    }
  };

  const handleMagicLink = async () => {
    setFormError('');
    if (!email) {
      setFormError('Podaj adres e‑mail, aby wysłać magiczny link.');
      return;
    }
    setIsSubmitting(true);
    try {
      await signInWithOtp(email);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <Helmet>
        <title>Konto klienta — logowanie i rejestracja • ByteClinic</title>
      </Helmet>
      <div className="flex justify-center items-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {isIOSInApp && (
            <div className="mb-4 max-w-md mx-auto rounded-md border border-amber-300 bg-amber-50 text-amber-900 p-3 text-sm">
              Wykryto wbudowaną przeglądarkę w aplikacji na iOS. Aby zalogować się bez problemów, otwórz tę stronę w Safari.
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => window.open(window.location.href, '_blank')}>Otwórz w Safari</Button>
                <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(window.location.href)}>Kopiuj link</Button>
              </div>
            </div>
          )}
          <Card className="w-full max-w-md bg-card/80 border-primary/20 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="font-mono text-2xl text-primary">Konto klienta</CardTitle>
              <CardDescription>Zaloguj się lub utwórz nowe konto, aby korzystać z panelu klienta.</CardDescription>
               <div className="mt-4 flex justify-center gap-2">
                 <Button
                   type="button"
                   size="sm"
                   variant={authMode === 'login' ? 'default' : 'outline'}
                   onClick={() => { setAuthMode('login'); setFormError(''); setSignupInfo(''); }}
                 >
                   Logowanie
                 </Button>
                 <Button
                   type="button"
                   size="sm"
                   variant={authMode === 'register' ? 'default' : 'outline'}
                   onClick={() => { setAuthMode('register'); setFormError(''); setSignupInfo(''); }}
                 >
                   Rejestracja
                 </Button>
               </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Adres e‑mail</Label>
                  <Input id="email" type="email" placeholder="np. jan.kowalski@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Hasło</Label>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isSubmitting} />
                  {authMode === 'register' && (
                    <p className="text-xs text-muted-foreground">Minimum 6 znaków. Nie udostępniaj hasła nikomu.</p>
                  )}
                </div>
                {authMode === 'register' && (
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Powtórz hasło</Label>
                    <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isSubmitting} />
                  </div>
                )}
                {formError && (
                  <p className="text-sm text-destructive" role="alert" aria-live="polite">{formError}</p>
                )}
                {signupInfo && (
                  <p className="text-sm text-muted-foreground" role="status" aria-live="polite">{signupInfo}</p>
                )}
              </div>
              {authMode === 'login' ? (
                <div className="space-y-2">
                  <Button className="w-full" onClick={handleSignIn} disabled={isSubmitting || !email || !password}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Zaloguj się
                  </Button>
                  <Button className="w-full" variant="outline" onClick={handleMagicLink} disabled={isSubmitting || !email}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Wyślij magiczny link na e‑mail
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Nie masz konta?{' '}
                    <button type="button" className="underline underline-offset-2" onClick={() => { setAuthMode('register'); setFormError(''); setSignupInfo(''); }}>
                      Utwórz konto
                    </button>
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button className="w-full" variant="secondary" onClick={handleSignUp} disabled={isSubmitting || !email || !password || !confirmPassword || password !== confirmPassword}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Utwórz konto
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Po rejestracji wyślemy wiadomość z linkiem aktywacyjnym. Potwierdź e‑mail, a następnie zaloguj się.
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    Masz już konto?{' '}
                    <button type="button" className="underline underline-offset-2" onClick={() => { setAuthMode('login'); setFormError(''); setSignupInfo(''); }}>
                      Zaloguj się
                    </button>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default AuthPage;
