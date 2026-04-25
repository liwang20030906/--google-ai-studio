import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Users, ShieldCheck, HeartPulse, ArrowRight } from 'lucide-react';
import { useStore } from './store';
import { Role } from './types';

export default function LoginPage() {
  const { login } = useStore();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [nickname, setNickname] = useState('');

  const handleLogin = () => {
    if (selectedRole && nickname.trim()) {
      login(selectedRole, nickname.trim());
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_20%_20%,#eff6ff_0%,transparent_50%),radial-gradient(circle_at_80%_80%,#fdf2f8_0%,transparent_50%)]">
      <div className="max-w-4xl w-full">
        <AnimatePresence mode="wait">
          {!selectedRole ? (
            <motion.div 
              key="role-selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {/* Patient Login */}
              <motion.button
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedRole('patient')}
                className="group relative bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-blue-100 border-4 border-transparent hover:border-blue-500 transition-all text-left overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50 rounded-full -mr-24 -mt-24 group-hover:scale-110 transition-transform" />
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white mb-8 shadow-xl shadow-blue-200">
                    <User size={40} />
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">我是老人用户</h2>
                  <p className="text-lg font-bold text-slate-500 leading-relaxed italic mb-8">
                    "自己管理用药，健康掌握在手"<br/>
                    操作简单，字体大，拍照就能记。
                  </p>
                  <div className="flex items-center gap-3 text-blue-600 font-black uppercase tracking-widest text-sm">
                    开启记录 <div className="w-8 h-1 bg-blue-600 rounded-full" />
                  </div>
                </div>
              </motion.button>

              {/* Caregiver Login */}
              <motion.button
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedRole('caregiver')}
                className="group relative bg-slate-900 p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200 border-4 border-transparent hover:border-blue-500 transition-all text-left overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 group-hover:scale-110 transition-transform" />
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-blue-500 rounded-[2rem] flex items-center justify-center text-white mb-8 shadow-xl shadow-blue-400/20">
                    <Users size={40} />
                  </div>
                  <h2 className="text-4xl font-black text-white mb-4 tracking-tight">我是家庭成员</h2>
                  <p className="text-lg font-bold text-slate-400 leading-relaxed italic mb-8">
                    "远程守护，让爱和健康常在"<br/>
                    实时关注，漏服提醒，代为管理。
                  </p>
                  <div className="flex items-center gap-3 text-blue-400 font-black uppercase tracking-widest text-sm">
                    进入监控 <div className="w-8 h-1 bg-blue-400 rounded-full" />
                  </div>
                </div>
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="nickname-entry"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-16 rounded-[4rem] shadow-2xl shadow-blue-100 max-w-xl mx-auto border border-slate-100"
            >
              <button 
                onClick={() => setSelectedRole(null)}
                className="text-slate-400 font-black text-xs uppercase tracking-widest mb-8 hover:text-blue-600 transition-colors"
              >
                ← 返回重选角色
              </button>
              
              <div className="mb-12">
                <div className={cn(
                  "w-20 h-20 rounded-[2rem] flex items-center justify-center text-white mb-8",
                  selectedRole === 'patient' ? "bg-blue-600 shadow-blue-200" : "bg-slate-900 shadow-slate-200"
                )}>
                  {selectedRole === 'patient' ? <User size={40} /> : <Users size={40} />}
                </div>
                <h2 className="text-4xl font-black text-slate-900 mb-2">如何称呼您？</h2>
                <p className="text-slate-500 font-bold italic">请输入您的昵称以开始服务</p>
              </div>

              <div className="space-y-8">
                <div className="relative">
                  <input
                    autoFocus
                    placeholder="请输入昵称..."
                    className="w-full bg-slate-50 border-4 border-slate-100 rounded-[2.5rem] p-8 text-2xl font-black text-slate-900 outline-none focus:border-blue-500/30 transition-all placeholder:text-slate-300"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                
                <button
                  onClick={handleLogin}
                  disabled={!nickname.trim()}
                  className="w-full bg-blue-600 text-white p-8 rounded-[2.5rem] font-black text-xl flex items-center justify-center gap-4 shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:grayscale"
                >
                  开启健康守护 <ArrowRight size={24} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-8 text-slate-300 font-bold uppercase tracking-[0.3em] text-[10px]">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} /> 安全加密存储
        </div>
        <div className="flex items-center gap-2">
          <HeartPulse size={14} /> 专业用药辅助
        </div>
      </div>
    </div>
  );
}

// Helper component for Tailwind class concatenation
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
