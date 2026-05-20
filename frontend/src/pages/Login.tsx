import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Stethoscope, Eye, EyeOff, Loader2, Shield, Zap, BarChart3, Package } from 'lucide-react';
import api from '@/api/axios';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const FEATURES = [
  { icon: Zap,        label: 'Fast Billing',    desc: 'Barcode POS system' },
  { icon: Shield,     label: 'GST Compliant',   desc: 'Auto tax calculations' },
  { icon: Package,    label: 'Stock Alerts',    desc: 'Never run out' },
  { icon: BarChart3,  label: 'Analytics',       desc: 'Business insights' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', data);
      const { user, accessToken, refreshToken } = response.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success(`Welcome back, ${user.fullName}!`);
      navigate('/dashboard');
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(222 47% 9%) 0%, hsl(209 100% 15%) 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-[-80px] right-[-80px] w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #0ea5e9, transparent)' }} />
        <div className="absolute bottom-[-60px] left-[-60px] w-72 h-72 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #22c55e, transparent)' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-primary to-sky-400 rounded-2xl flex items-center justify-center shadow-glow">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">Shri Ram Medical</p>
              <p className="text-sky-300 text-xs">Mandla, Madhya Pradesh</p>
            </div>
          </div>

          {/* Hero text */}
          <div>
            <h1 className="text-4xl font-bold text-white leading-snug mb-4">
              Professional<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #38bdf8, #818cf8)' }}>
                Pharmacy
              </span><br />
              Management
            </h1>
            <p className="text-sky-200/80 text-base leading-relaxed max-w-sm">
              Complete solution for billing, inventory, GST compliance, and analytics for modern pharmacies.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {FEATURES.map((f) => (
                <div key={f.label}
                  className="flex items-start gap-3 rounded-xl p-3.5"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-4 h-4 text-sky-300" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm leading-tight">{f.label}</p>
                    <p className="text-sky-300/70 text-xs mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sky-400/50 text-xs">
            © {new Date().getFullYear()} Shri Ram Medical Mandla. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right login panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-sky-500 rounded-xl flex items-center justify-center shadow-glow-sm">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">Shri Ram Medical</p>
              <p className="text-muted-foreground text-xs">Mandla, Madhya Pradesh</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-card border border-border rounded-2xl shadow-modal p-8">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h2>
              <p className="text-muted-foreground text-sm mt-1.5">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username or Email</Label>
                <Input
                  id="username"
                  placeholder="Enter username or email"
                  autoComplete="username"
                  autoFocus
                  {...register('username')}
                  className={errors.username ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    {...register('password')}
                    className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full h-11 text-sm font-semibold shadow-glow-sm" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In to MedStore'
                )}
              </Button>
            </form>

            <div className="mt-6 rounded-xl p-4 border border-border bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground mb-2.5">Demo Credentials</p>
              <div className="space-y-1.5 text-xs">
                {[
                  { role: 'Admin', cred: 'admin / Admin@123' },
                  { role: 'Pharmacist', cred: 'pharmacist / Pharm@123' },
                  { role: 'Cashier', cred: 'cashier / Cash@123' },
                ].map(({ role, cred }) => (
                  <div key={role} className="flex justify-between items-center">
                    <span className="text-muted-foreground">{role}</span>
                    <span className="font-mono text-foreground bg-muted px-2 py-0.5 rounded">{cred}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
