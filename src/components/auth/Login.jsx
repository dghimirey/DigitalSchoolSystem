import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  User, 
  ChevronRight, 
  Sparkles, 
  ShieldCheck, 
  BarChart3, 
  Trophy, 
  Zap, 
  TrendingUp, 
  Users,
  GraduationCap
} from 'lucide-react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('parent'); // Default selection
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data.user, data.token);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'admin', label: 'Admin', icon: ShieldCheck, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { id: 'teacher', label: 'Teacher', icon: Zap, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { id: 'parent', label: 'Parent', icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  ];

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-indigo-500/30">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[150px]"></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-cyan-600/10 blur-[100px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-xl overflow-hidden rounded-[3rem] border border-white/5 bg-white/[0.02] backdrop-blur-3xl shadow-2xl relative z-10"
      >
        {/* Right Side: Form (Now centered) */}
        <div className="p-8 sm:p-12 lg:p-20 flex flex-col justify-center items-center relative overflow-hidden bg-[#0a0f1e]/50">
          <div className="w-full max-w-md mx-auto relative z-10">
            {/* Header for centered layout */}
            <div className="mb-10 text-center">
              <div className="bg-indigo-600/10 w-fit p-4 rounded-3xl mx-auto mb-6">
                <GraduationCap className="h-10 w-10 text-indigo-400" />
              </div>
              <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none mb-3">Digital School System</h2>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Login to your account</p>
            </div>


            {/* Role Selection */}
            <div className="grid grid-cols-3 gap-3 mb-10">
              {roles.map(r => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-2 group ${
                    role === r.id 
                    ? `bg-white/[0.08] border-white/20 shadow-xl shadow-white/5` 
                    : 'bg-transparent border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className={`p-2 rounded-xl border border-white/5 ${r.bg} ${role === r.id ? 'scale-110' : ''} transition-transform`}>
                    <r.icon className={`h-5 w-5 ${r.color}`} />
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${role === r.id ? 'text-white' : 'text-slate-500'}`}>
                    {r.label}
                  </span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mb-8 p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3"
                >
                  <label className="flex-1 text-center">Error: {error}</label>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Username / Mobile</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-16 pr-8 py-5 rounded-[2rem] border border-white/10 bg-white/[0.03] text-white focus:bg-white/[0.05] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all outline-none font-bold placeholder:text-slate-700"
                    placeholder="Enter your username"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-16 pr-16 py-5 rounded-[2rem] border border-white/10 bg-white/[0.03] text-white focus:bg-white/[0.05] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all outline-none font-bold placeholder:text-slate-700"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-6 flex items-center text-slate-600 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between px-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="peer sr-only" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <div className="w-5 h-5 border-2 border-white/10 rounded-lg group-hover:border-indigo-500/50 transition-all peer-checked:bg-indigo-600 peer-checked:border-indigo-600"></div>
                    <ChevronRight className="absolute inset-0 h-3 w-3 text-white m-auto opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">Remember me</span>
                </label>
                <button type="button" className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors">Forgot Password?</button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full group relative overflow-hidden py-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>
                <span className="flex items-center justify-center gap-3 relative z-10">
                  {loading ? 'Logging in...' : 'Login'}
                  <Sparkles className="h-4 w-4" />
                </span>
              </button>
            </form>

          </div>
        </div>
      </motion.div>
    </div>
  );
}

