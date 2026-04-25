import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Package, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Settings,
  History,
  Pill,
  MoreVertical,
  Activity,
  Heart,
  User,
  Users,
  LogOut,
  Camera,
  Edit2,
  Trash2,
  ChevronDown,
  Bell,
  BarChart3,
  RefreshCcw,
  ArrowRight
} from 'lucide-react';
import { format, differenceInDays, startOfToday, subDays, isWithinInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useStore } from './store';
import { cn } from './lib/utils';
import MedicationModal from './MedicationModal';
import { Medication } from './types';
import LoginPage from './LoginPage';

export default function App() {
  const { 
    currentUser,
    selectedPatientId,
    medications, 
    records, 
    followUps, 
    events, 
    takeMedication, 
    skipMedication, 
    syncTodayRecords,
    logout,
    trackEvent,
    patients,
    addPatient,
    switchPatient,
    linkPatientByCode
  } = useStore();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | undefined>();
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [addPatientMode, setAddPatientMode] = useState<'create' | 'link'>('create');
  const [newPatientName, setNewPatientName] = useState('');
  const [linkCode, setLinkCode] = useState('');

  useEffect(() => {
    if (selectedPatientId) {
      syncTodayRecords(selectedPatientId);
    }
  }, [selectedPatientId, syncTodayRecords]);

  const patientMeds = medications.filter(m => m.patientId === selectedPatientId);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayRecords = records
    .filter(r => r.patientId === selectedPatientId && r.date === todayStr)
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const completionRate = useMemo(() => {
    if (todayRecords.length === 0) return 100;
    const completed = todayRecords.filter(r => r.status !== 'pending').length;
    return Math.round((completed / todayRecords.length) * 100);
  }, [todayRecords]);

  const streakInfo = useMemo(() => {
    const info: Record<string, number> = {};
    const sortedRecords = [...records].sort((a, b) => new Date(b.date + ' ' + b.scheduledTime).getTime() - new Date(a.date + ' ' + a.scheduledTime).getTime());
    
    patientMeds.forEach(med => {
      let streak = 0;
      const medRecords = sortedRecords.filter(r => r.medId === med.id && new Date(r.date + ' ' + r.scheduledTime).getTime() < Date.now());
      for (const record of medRecords) {
        if (record.status === 'taken') break;
        streak++;
      }
      info[med.id] = streak;
    });
    return info;
  }, [records, patientMeds]);

  const maxStreak = useMemo(() => {
    const streaks = Object.values(streakInfo) as number[];
    return streaks.length > 0 ? Math.max(...streaks) : 0;
  }, [streakInfo]);

  const weeklyStats = useMemo(() => {
    const last7Days = { start: subDays(new Date(), 7), end: new Date() };
    const weekRecords = records.filter(r => r.patientId === selectedPatientId && isWithinInterval(new Date(r.date), last7Days));
    const total = weekRecords.length;
    const taken = weekRecords.filter(r => r.status === 'taken').length;
    const rate = total > 0 ? Math.round((taken / total) * 100) : 0;
    const missed = weekRecords.filter(r => r.status !== 'taken' && new Date(r.date + ' ' + r.scheduledTime).getTime() < Date.now()).length;
    
    return { rate, missed, total };
  }, [records, selectedPatientId]);

  if (!currentUser) {
    return <LoginPage />;
  }

  const stockAlerts = patientMeds.filter(m => m.status === 'active' && m.stock <= m.threshold);
  const nextFollowUp = followUps[0];
  const daysToFollowUp = nextFollowUp 
    ? differenceInDays(new Date(nextFollowUp.appointmentDate), startOfToday()) 
    : null;

  const handleEditMed = (med: Medication) => {
    setEditingMed(med);
    setIsModalOpen(true);
  };

  const handleAddMed = () => {
    setEditingMed(undefined);
    setIsModalOpen(true);
  };

  const renderPatientDashboard = () => (
    <div className="flex w-full h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      <aside className="w-80 flex flex-col gap-8 p-8 bg-white border-r border-slate-200 overflow-y-auto custom-scrollbar shrink-0">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-blue-600 tracking-tight flex items-center gap-2">
            <span className="p-1.5 bg-blue-600 rounded-xl text-white">
              <Activity size={24} />
            </span>
            用药小管家
          </h1>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.2em]">Patient Mode</p>
        </header>

        <nav className="flex-1 space-y-3">
          <NavItem 
            icon={<Activity size={22} />} 
            label="我的今日打卡" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <NavItem 
            icon={<Pill size={22} />} 
            label="我的数字药箱" 
            active={activeTab === 'meds'} 
            onClick={() => setActiveTab('meds')} 
          />
        </nav>

        <div className="space-y-6 pt-10 border-t border-slate-100">
          <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
            <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">我的守护码</div>
            <div className="text-3xl font-black text-blue-600 tracking-tighter tabular-nums mb-2">{currentUser.patientCode}</div>
            <p className="text-[10px] text-blue-400/80 leading-relaxed font-bold">请将此编码告知家属，<br/>以便建立远程监护连接。</p>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-3 w-full p-4 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all font-black uppercase tracking-widest text-xs"
          >
            <LogOut size={18} /> 退出登录
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col p-10 overflow-y-auto custom-scrollbar">
        <header className="flex justify-between items-end mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-[0.2em]">{currentUser.name}，您好</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(), 'yyyy年MM月dd日')}</span>
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
              {activeTab === 'dashboard' ? "今日用药提醒" : "我的药箱明细"}
            </h2>
          </div>
          <button 
            onClick={handleAddMed}
            className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Camera size={18} /> 拍照录药
          </button>
        </header>

        <section className="grid grid-cols-3 gap-8 mb-12">
          <StatCard label="下个用药时刻" value={todayRecords.find(r => r.status === 'pending')?.scheduledTime || '--:--'} unit="等待中" />
          <StatCard label="还要吃几次" value={todayRecords.filter(r => r.status === 'pending').length} unit="次任务" isWarning={todayRecords.filter(r => r.status === 'pending').length > 0} />
          <StatCard label="今日完成率" value={`${completionRate}%`} unit="已执行" />
        </section>

        {activeTab === 'dashboard' ? (
          <div className="space-y-8">
            {maxStreak >= 2 && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-red-500 text-white p-8 rounded-[3rem] shadow-xl shadow-red-200 flex items-center gap-6"
              >
                <div className="p-4 bg-white/20 rounded-2xl">
                  <AlertCircle size={32} />
                </div>
                <div>
                  <h4 className="text-xl font-black">发现严重的连续漏服！</h4>
                  <p className="text-sm font-bold text-red-100 mt-1">
                    系统监测到您有药品已连续超过 {maxStreak} 次未打卡，请务必按时服用。
                  </p>
                </div>
              </motion.div>
            )}

            <AnimatePresence mode="popLayout">
              {todayRecords.length === 0 ? (
                <div className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest">今日暂无任务</div>
              ) : (
                todayRecords.map(record => {
                  const med = medications.find(m => m.id === record.medId);
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={record.id} 
                      className={cn(
                        "p-10 rounded-[3rem] border-4 flex justify-between items-center transition-all",
                        record.status === 'pending' ? "bg-white border-blue-100 shadow-xl" : "bg-slate-50 border-slate-50 opacity-50"
                      )}
                    >
                        <div className="flex items-center gap-8">
                          <div className="w-20 h-20 bg-slate-100 rounded-3xl overflow-hidden shadow-inner">
                            {med?.imageUrl && <img src={med.imageUrl} className="w-full h-full object-cover" />}
                          </div>
                          <div>
                            <h3 className="text-2xl font-black text-slate-900">{record.medName}</h3>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">{record.scheduledTime} 场次 · {med?.dosagePerTime}{med?.unit}</p>
                          </div>
                        </div>
                        {record.status === 'pending' ? (
                          <button 
                            onClick={() => takeMedication(record.id)}
                            className="px-12 py-6 bg-blue-600 text-white rounded-[2rem] text-xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
                          >
                            确认已服
                          </button>
                        ) : (
                          <div className="text-right">
                            <div className="text-green-600 font-black text-xl italic tracking-tighter uppercase">已打卡</div>
                            <div className="text-xs font-black text-slate-400 uppercase mt-1 tracking-widest">{format(new Date(record.actualTime!), 'HH:mm')}</div>
                          </div>
                        )}
                    </motion.div>
                  )
                })
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-8">
            {patientMeds.map(med => (
              <div key={med.id} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex justify-between items-center group hover:shadow-xl transition-all">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-slate-50 rounded-2xl overflow-hidden">
                    {med.imageUrl && <img src={med.imageUrl} className="w-full h-full object-cover" />}
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900">{med.name}</h4>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">剩余 {med.stock} {med.unit}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleEditMed(med)}
                  className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                >
                  <Edit2 size={24} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );

  const renderCaregiverDashboard = () => {
    const missedToday = todayRecords.filter(r => r.status === 'pending' && r.scheduledTime < format(new Date(), 'HH:mm'));

    return (
      <div className="flex w-full h-screen bg-slate-900 text-white font-sans overflow-hidden">
         <aside className="w-80 flex flex-col gap-8 p-8 bg-slate-950 border-r border-white/5 overflow-y-auto custom-scrollbar-dark shrink-0">
          <header className="space-y-1">
            <h1 className="text-2xl font-bold text-blue-500 tracking-tight flex items-center gap-2">
              <span className="p-1.5 bg-blue-500 rounded-xl text-white">
                <Heart size={24} />
              </span>
              守护助手
            </h1>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em]">Caregiver Mode</p>
          </header>

          <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">家庭守护对象</div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setIsAddingPatient(true); setAddPatientMode('link'); }}
                  className="p-1 hover:bg-white/10 rounded-lg text-blue-400 transition-all title='输入编码绑定'"
                >
                  <RefreshCcw size={16} />
                </button>
                <button 
                  onClick={() => { setIsAddingPatient(true); setAddPatientMode('create'); }}
                  className="p-1 hover:bg-white/10 rounded-lg text-blue-400 transition-all title='直接添加'"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            
            <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar-dark">
              {patients.map(p => (
                <button
                  key={p.id}
                  onClick={() => switchPatient(p.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-3 rounded-2xl border transition-all",
                    selectedPatientId === p.id 
                      ? "bg-blue-500/20 border-blue-500/40 text-white" 
                      : "bg-white/5 border-transparent text-slate-400 hover:bg-white/10"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black",
                    selectedPatientId === p.id ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-500"
                  )}>
                    {p.name.charAt(0)}
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-xs font-black">{p.name}</div>
                    {selectedPatientId === p.id && (
                      <div className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">正在查看</div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {isAddingPatient && (
              <div className="mt-4 pt-4 border-t border-white/5">
                {addPatientMode === 'create' ? (
                  <>
                    <input 
                      autoFocus
                      placeholder="输入老人姓名..."
                      className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-xs focus:border-blue-500 outline-none mb-3"
                      value={newPatientName}
                      onChange={e => setNewPatientName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          if (newPatientName.trim()) {
                            addPatient(newPatientName.trim());
                            setNewPatientName('');
                            setIsAddingPatient(false);
                          }
                        }}
                        className="flex-1 py-2 bg-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest"
                      >
                        添加
                      </button>
                      <button 
                        onClick={() => setIsAddingPatient(false)}
                        className="flex-1 py-2 bg-white/5 rounded-lg text-[10px] font-black uppercase tracking-widest"
                      >
                        取消
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <input 
                      autoFocus
                      placeholder="输入 6 位守护码..."
                      className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-xs focus:border-blue-500 outline-none mb-3"
                      value={linkCode}
                      onChange={e => setLinkCode(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          try {
                            linkPatientByCode(linkCode);
                            setLinkCode('');
                            setIsAddingPatient(false);
                          } catch (e) {
                            alert(e instanceof Error ? e.message : '绑定失败');
                          }
                        }}
                        className="flex-1 py-2 bg-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest"
                      >
                        绑定
                      </button>
                      <button 
                        onClick={() => setIsAddingPatient(false)}
                        className="flex-1 py-2 bg-white/5 rounded-lg text-[10px] font-black uppercase tracking-widest"
                      >
                        取消
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/5">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">当前对象打卡</div>
              <div className="text-sm font-black text-blue-400">{completionRate}%</div>
            </div>
          </div>

          <nav className="flex-1 space-y-3">
            <NavItem 
              icon={<TrendingUp size={22} />} 
              label="异常风险概览" 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
            />
            <NavItem 
              icon={<Bell size={22} />} 
              label="风险提醒中心" 
              active={activeTab === 'notifications'} 
              onClick={() => setActiveTab('notifications')} 
            />
            <NavItem 
              icon={<Package size={22} />} 
              label="远程药单管理" 
              active={activeTab === 'meds'} 
              onClick={() => setActiveTab('meds')} 
            />
            <NavItem 
              icon={<History size={22} />} 
              label="历史执行日志" 
              active={activeTab === 'history'} 
              onClick={() => setActiveTab('history')} 
            />
          </nav>

          <div className="space-y-6 pt-10 border-t border-white/5">
            <button 
              onClick={logout}
              className="flex items-center gap-3 w-full p-4 text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all font-black uppercase tracking-widest text-xs"
            >
              <LogOut size={18} /> 退出管理模式
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col p-10 overflow-y-auto custom-scrollbar bg-[radial-gradient(circle_at_20%_20%,#0f172a_0%,transparent_50%)]">
           <header className="flex justify-between items-end mb-12">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-1 rounded-md uppercase tracking-[0.2em]">守护者：{currentUser.name}</span>
              </div>
              <h2 className="text-4xl font-black text-white tracking-tighter">
                {activeTab === 'dashboard' ? "异常风险与实时动态" : activeTab === 'meds' ? "代录药品与库存" : "全量历史追踪"}
              </h2>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={handleAddMed}
                className="flex items-center gap-3 px-8 py-4 bg-white text-slate-900 rounded-2xl text-sm font-black shadow-xl hover:bg-slate-100 transition-all"
              >
                <Plus size={18} /> 代录药品
              </button>
            </div>
          </header>

          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-12 gap-10">
              <div className="col-span-8 space-y-8">
                 <div className="bg-slate-800/50 p-10 rounded-[3rem] border border-white/5 backdrop-blur-xl">
                    <div className="flex justify-between items-center mb-8">
                       <h3 className="text-xl font-black text-blue-400 uppercase tracking-widest">本周健康数据看板</h3>
                       <div className="px-4 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black uppercase text-blue-400">最近 7 天</div>
                    </div>
                    <div className="grid grid-cols-3 gap-8 mb-10">
                       <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">平均服药率</div>
                          <div className="text-4xl font-black tabular-nums">{weeklyStats.rate}%</div>
                       </div>
                       <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">累计漏服</div>
                          <div className="text-4xl font-black tabular-nums text-red-400">{weeklyStats.missed} 次</div>
                       </div>
                       <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">需要续方</div>
                          <div className="text-4xl font-black tabular-nums text-orange-400">{stockAlerts.length} 种</div>
                       </div>
                    </div>
                    <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${weeklyStats.rate}%` }}
                        className={cn("h-full rounded-full shadow-lg", weeklyStats.rate > 80 ? "bg-green-500" : "bg-blue-500")}
                      />
                    </div>
                 </div>

                 <div className="space-y-6">
                    <h3 className="text-xl font-black text-white/50 uppercase tracking-widest px-4">今日详细状态</h3>
                    {todayRecords.map(record => {
                      const med = medications.find(m => m.id === record.medId);
                      return (
                        <div key={record.id} className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 flex justify-between items-center hover:bg-white/10 transition-all">
                           <div className="flex items-center gap-6">
                              <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center",
                                record.status === 'taken' ? "bg-green-500/20 text-green-400" : record.status === 'skipped' ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
                              )}>
                                {record.status === 'taken' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                              </div>
                              <div>
                                <div className="text-xl font-black">{record.medName}</div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">方案时刻 {record.scheduledTime} {record.isProxy && "· 家属代确认"}</div>
                              </div>
                           </div>
                           {record.status === 'pending' && (
                             <button 
                               onClick={() => {
                                 if (confirm('确认代老人标记为已服药吗？')) {
                                   takeMedication(record.id, true);
                                 }
                               }}
                               className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700"
                             >
                               代确认已服
                             </button>
                           )}
                           {record.status === 'taken' && (
                             <div className="text-right">
                               <div className="text-green-400 font-black text-sm uppercase">已确认</div>
                               <div className="text-[10px] text-slate-500 mt-1">{format(new Date(record.actualTime!), 'HH:mm')}</div>
                             </div>
                           )}
                        </div>
                      )
                    })}
                 </div>
              </div>

              <div className="col-span-4 space-y-8">
                 {missedToday.length > 0 && (
                   <AlertCard title="漏服紧急提醒" description="由于已过设定时间，请联系老人" color="red">
                     <div className="space-y-4">
                       {missedToday.map(r => (
                         <div key={r.id} className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 flex items-center gap-4">
                           <AlertCircle size={20} className="text-red-400" />
                           <div className="text-xs font-bold text-red-200">王大爷 漏服了 {r.medName}</div>
                         </div>
                       ))}
                     </div>
                   </AlertCard>
                 )}

                 <AlertCard title="低库存管理" description="请帮助老人补足购药" color="orange">
                    <div className="space-y-4">
                      {stockAlerts.map(m => (
                        <div key={m.id} className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20 flex justify-between items-center text-orange-200">
                          <div className="text-xs font-bold">{m.name} 仅剩 {m.stock}</div>
                          <button className="text-[10px] font-black underline">去补录</button>
                        </div>
                      ))}
                    </div>
                 </AlertCard>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-4xl space-y-8">
               <h3 className="text-2xl font-black mb-8 px-4">智能提醒建议</h3>
               
               {/* 连续漏服警告 */}
               {Object.entries(streakInfo).filter(([_, s]) => (s as number) >= 2).map(([id, streak]) => {
                 const med = medications.find(m => m.id === id);
                 return (
                   <div key={id} className="bg-red-500/10 border border-red-500/20 p-8 rounded-[2.5rem] flex items-center justify-between">
                     <div className="flex items-center gap-6">
                       <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500">
                         <AlertCircle size={32} />
                       </div>
                       <div>
                         <h4 className="text-xl font-black text-red-400">连续 {streak} 次漏服风险！</h4>
                         <p className="text-sm font-bold text-slate-400 mt-1">{med?.name} 已长时间未打卡，建议立即连线指导</p>
                       </div>
                     </div>
                     <button className="px-6 py-3 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">
                       远程协助
                     </button>
                   </div>
                 );
               })}

               {/* 低库存 */}
               <div className="bg-white/5 border border-white/5 p-8 rounded-[3rem]">
                  <div className="flex items-center gap-4 mb-8">
                    <Package className="text-orange-400" />
                    <h4 className="text-xl font-black">库存与续方建议</h4>
                  </div>
                  <div className="space-y-4">
                    {stockAlerts.map(med => (
                      <div key={med.id} className="p-6 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                             {med.imageUrl && <img src={med.imageUrl} className="w-full h-full object-cover" />}
                           </div>
                           <div>
                             <div className="font-black text-sm">{med.name}</div>
                             <div className="text-[10px] text-slate-500 uppercase font-black">预计还可支持 3 天内</div>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                             补药
                           </button>
                           <button className="px-4 py-2 bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                             续方
                           </button>
                        </div>
                      </div>
                    ))}
                    {stockAlerts.length === 0 && <div className="text-slate-600 text-sm italic">当前库存充足</div>}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'meds' && (
            <div className="grid grid-cols-2 gap-8">
               {patientMeds.map(med => (
                 <div key={med.id} className="bg-white/5 p-10 rounded-[3rem] border border-white/5 hover:bg-white/10 transition-all flex justify-between items-center">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-slate-800 rounded-2xl overflow-hidden border border-white/10">
                        {med.imageUrl && <img src={med.imageUrl} className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-white">{med.name}</h4>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">当前库存：{med.stock} {med.unit}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => handleEditMed(med)}
                        className="p-3 bg-white/5 rounded-xl hover:bg-white/20 transition-all text-slate-400 hover:text-white"
                      >
                         <Edit2 size={20} />
                      </button>
                    </div>
                 </div>
               ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-white/50 uppercase tracking-widest px-4">原始执行审计</h3>
              <div className="flex flex-col gap-2">
                {events.slice(0, 50).map(event => (
                  <div key={event.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 text-[10px] flex justify-between items-center">
                    <span className="text-blue-400 font-black tracking-tighter">[{format(new Date(event.timestamp), 'HH:mm:ss')}]</span>
                    <span className="flex-1 px-6 font-bold uppercase tracking-widest">{event.name}</span>
                    <span className="text-slate-600 italic">ID-{event.id.slice(0,8)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-blue-100 selection:text-blue-900 font-sans antialiased text-slate-900">
      {currentUser.role === 'patient' ? renderPatientDashboard() : renderCaregiverDashboard()}

      <MedicationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        medication={editingMed}
      />
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-6 px-8 py-6 rounded-[2.5rem] text-sm font-black transition-all duration-500 active:scale-[0.98] group relative overflow-hidden",
        active 
          ? "bg-blue-600 text-white shadow-2xl shadow-blue-500/20" 
          : "text-slate-500 hover:bg-white/10 hover:text-white"
      )}
    >
      <div className={cn(
        "transition-all duration-500",
        active ? "text-white scale-125 rotate-6" : "group-hover:text-blue-500 group-hover:scale-110"
      )}>
        {icon}
      </div>
      <span className="uppercase tracking-[0.2em]">{label}</span>
      {active && (
        <motion.div 
          layoutId="activeNavIndicator"
          className="absolute right-0 top-6 bottom-6 w-1.5 bg-white rounded-l-full shadow-[0_0_12px_rgba(255,255,255,0.8)]"
        />
      )}
    </button>
  );
}

function StatCard({ label, value, unit, isWarning }: { label: string, value: string | number, unit: string, isWarning?: boolean }) {
  return (
    <div className={cn(
      "p-8 rounded-[3rem] border transition-all duration-500 shadow-lg",
      isWarning 
        ? "bg-red-500 text-white border-red-400 shadow-red-200" 
        : "bg-white border-slate-100 text-slate-900 shadow-slate-100"
    )}>
      <div className={cn(
        "text-[10px] font-black uppercase tracking-[0.4em] mb-6",
        isWarning ? "text-red-100" : "text-slate-400"
      )}>
        {label}
      </div>
      <div className="flex items-baseline gap-4">
        <span className="text-5xl font-black italic tracking-tighter leading-none">{value}</span>
        <span className={cn(
          "text-xs font-black uppercase tracking-[0.2em] opacity-40",
          isWarning ? "text-white" : "text-slate-300"
        )}>
          {unit}
        </span>
      </div>
    </div>
  );
}

function AlertCard({ title, description, color, children }: { title: string; description: string; color: 'orange' | 'red'; children: React.ReactNode }) {
  const colorClasses = {
    orange: "border-orange-500/20 bg-orange-500/5",
    red: "border-red-500/20 bg-red-500/5"
  };

  const titleClasses = {
    orange: "text-orange-400",
    red: "text-red-400"
  };

  return (
    <section className={cn("p-10 rounded-[3.5rem] border transition-all", colorClasses[color])}>
      <div className="mb-10">
        <h3 className={cn("text-2xl font-black tracking-tight", titleClasses[color])}>{title}</h3>
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mt-2 italic font-serif">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}
