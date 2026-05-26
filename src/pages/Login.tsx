import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { Lottie } from '@/components/Lottie';
import { Auth } from '@/lib/api/services';
import { useAuthStore } from '@/lib/stores/auth';

export function LoginPage() {
  const { token, loginSuccess, setActiveSchool } = useAuthStore();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [schoolId, setSchoolId] = useState('');

  if (token) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (schoolId) setActiveSchool(schoolId);
      const { token, user } = await Auth.login({ username, password });
      if (user.schoolId) setActiveSchool(user.schoolId);
      loginSuccess(token, user);
      toast.success(`Welcome, ${user.firstName}`);
      navigate('/', { replace: true });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-canvas">
      <div className="relative hidden lg:flex flex-col p-10 overflow-hidden text-white"
           style={{ background: 'radial-gradient(120% 80% at 100% 0%, #7C3AED 0%, #4F46E5 35%, #1E1B4B 100%)' }}>
        <div className="relative z-10 flex items-center justify-between">
          <Logo mark="light" />
          <a className="text-sm/none text-white/70 hover:text-white" href="/">Switch tenant →</a>
        </div>
        <div className="relative z-10 mt-auto">
          <Lottie src="/lottie/school-hero.json" className="w-80 mx-auto opacity-95" />
          <h1 className="font-display text-[40px] leading-[1.1] tracking-tight font-bold mt-6">
            Run your school.<br />Beautifully.
          </h1>
          <p className="mt-4 text-white/80 text-[15px] max-w-md">
            One place for admissions, attendance, fees, exams, transport, library, sports and parent communication.
          </p>
          <div className="mt-8 flex gap-2 flex-wrap">
            {['Cash payments','RFID attendance','Report cards','PTM scheduling','Bulk import'].map(t => (
              <span key={t} className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 backdrop-blur border border-white/15">{t}</span>
            ))}
          </div>
        </div>
        <div aria-hidden className="absolute -bottom-20 -right-20 w-[480px] h-[480px] rounded-full bg-white/5 blur-2xl" />
      </div>
      <div className="flex items-center justify-center p-6">
        <motion.div className="w-full max-w-sm"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}>
          <div className="lg:hidden mb-8"><Logo /></div>
          <h2 className="font-display text-[28px] font-bold tracking-tight">Sign in</h2>
          <p className="text-ink-500 mt-2 text-sm">School Admin console.</p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="label">School code</label>
              <input className="input mt-2" value={schoolId} onChange={e=>setSchoolId(e.target.value)} placeholder="e.g. greenwood" />
              <p className="text-[11px] text-ink-400 mt-1.5">Short identifier from your welcome email. Auto-detected after first sign-in.</p>
            </div>
            <div>
              <label className="label">Username</label>
              <input className="input mt-2" autoFocus required value={username} onChange={e=>setUsername(e.target.value)} placeholder="principal_jane" />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input mt-2" type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full h-11 mt-2">
              {submitting ? 'Signing in…' : (<>Continue <Icon name="arrow-right" size={16} /></>)}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
