/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Trash2, Calendar, Clock, Info, Package, Camera, Sparkles, PlusCircle, CheckCircle2, ChevronRight, ChevronLeft, Loader2, Image as ImageIcon, RefreshCcw } from 'lucide-react';
import { Medication } from './types';
import { useStore } from './store';
import { cn } from './lib/utils';
import { trackEvent } from './lib/analytics';
import { analyzeMedicationImage, ExtractedMedication } from './lib/aiMedicationService';

interface MedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  medication?: Medication; // If provided, we are editing
}

type Step = 'CHOICE' | 'SCAN' | 'ANALYZE' | 'BASIC' | 'SCHEDULE' | 'STOCK';

export default function MedicationModal({ isOpen, onClose, medication }: MedicationModalProps) {
  const { addMedication, updateMedication, deleteMedication, replaceMedication, refillStock, selectedPatientId } = useStore();
  
  const [step, setStep] = useState<Step>(medication ? 'BASIC' : 'CHOICE');
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [refillType, setRefillType] = useState<'refill' | 'renewal'>('refill');
  const [refillAmount, setRefillAmount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Medication>>({
    name: '',
    dosage: '',
    unit: '片',
    frequency: 'daily',
    dosagePerTime: 1,
    stock: 0,
    threshold: 5,
    reminderTimes: ['08:00'],
    startDate: new Date().toISOString().split('T')[0],
    status: 'active',
    notes: '',
    category: '',
    isLongTerm: true,
    requiresRefillReminder: true
  });

  useEffect(() => {
    if (medication) {
      setFormData(medication);
      setStep('BASIC');
      if (medication.imageUrl) setPreviewImage(medication.imageUrl);
    } else {
      setFormData({
        name: '',
        dosage: '',
        unit: '片',
        frequency: 'daily',
        dosagePerTime: 1,
        stock: 0,
        threshold: 5,
        reminderTimes: ['08:00'],
        startDate: new Date().toISOString().split('T')[0],
        status: 'active',
        notes: '',
        category: '',
        isLongTerm: true,
        requiresRefillReminder: true
      });
      setStep('CHOICE');
      setPreviewImage(null);
    }
  }, [medication, isOpen]);

  if (!isOpen) return null;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPreviewImage(base64);
      setStep('ANALYZE');
      setIsAnalysing(true);
      
      try {
        const result = await analyzeMedicationImage(base64, file.type);
        setFormData(prev => ({
          ...prev,
          name: result.name,
          dosage: result.dosage,
          dosagePerTime: result.dosagePerTime,
          unit: result.unit as any,
          frequency: result.frequency as any,
          notes: result.notes,
          category: result.category,
          imageUrl: base64
        }));
        setStep('BASIC');
      } catch (err) {
        console.error("AI Analysis failed", err);
        alert("识别失败，请尝试手动输入或重新拍摄。");
        setStep('BASIC');
      } finally {
        setIsAnalysing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    const finalData = {
      ...formData,
      id: isReplacing ? Math.random().toString(36).substr(2, 9) : (medication?.id || Math.random().toString(36).substr(2, 9)),
      imageUrl: previewImage || undefined,
      patientId: medication?.patientId || selectedPatientId || ''
    } as Medication;

    if (isReplacing && medication) {
      replaceMedication(medication.id, finalData);
      trackEvent('medication_replaced', { oldId: medication.id, newId: finalData.id });
    } else if (medication) {
      updateMedication(medication.id, finalData);
      if (refillAmount > 0) {
        refillStock(medication.id, refillAmount, refillType);
      }
      trackEvent('stock_updated', { medId: medication.id, newStock: finalData.stock });
    } else {
      addMedication(finalData);
      trackEvent('medicine_added', { medId: finalData.id, medName: finalData.name });
    }
    onClose();
  };

  const handleAddTime = () => {
    setFormData(prev => ({
      ...prev,
      reminderTimes: [...(prev.reminderTimes || []), '08:00']
    }));
  };

  const handleRemoveTime = (index: number) => {
    setFormData(prev => ({
      ...prev,
      reminderTimes: prev.reminderTimes?.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateTime = (index: number, val: string) => {
    setFormData(prev => {
      const times = [...(prev.reminderTimes || [])];
      times[index] = val;
      return { ...prev, reminderTimes: times };
    });
  };

  const renderStep = () => {
    switch (step) {
      case 'CHOICE':
        return (
          <div className="flex-1 flex flex-col justify-center items-center py-12 px-10 gap-8 overflow-y-auto custom-scrollbar">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full relative group p-10 bg-blue-600 rounded-[2.5rem] text-white flex flex-col items-center gap-6 shadow-2xl shadow-blue-200 transition-all active:scale-[0.98] overflow-hidden shrink-0"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 group-hover:scale-110 transition-transform" />
              <Camera size={48} className="relative z-10" />
              <div className="relative z-10 text-center">
                <span className="text-2xl font-black block mb-2">智能拍照录入</span>
                <span className="text-xs font-bold text-blue-100 uppercase tracking-widest flex items-center justify-center gap-2">
                  <Sparkles size={14} /> AI 辅助提取信息
                </span>
              </div>
            </button>
            <button
              onClick={() => setStep('BASIC')}
              className="w-full p-10 bg-white border-4 border-slate-100 rounded-[2.5rem] text-slate-800 flex flex-col items-center gap-6 hover:border-blue-400 hover:bg-blue-50/50 transition-all active:scale-[0.98] shrink-0"
            >
              <PlusCircle size={48} className="text-slate-400" />
              <div className="text-center">
                <span className="text-2xl font-black block mb-2 text-slate-900">手动添加药单</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic tracking-[0.2em]">Manual Entry Protocol</span>
              </div>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageSelect}
              capture="environment"
            />
          </div>
        );
      case 'ANALYZE':
        return (
          <div className="flex-1 flex flex-col justify-center items-center py-24 px-10 gap-8 overflow-y-auto custom-scrollbar">
            <div className="relative">
              <div className="w-64 h-64 rounded-full border-8 border-blue-50 border-t-blue-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={64} className="text-blue-600 animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-4">
              <h3 className="text-3xl font-black text-slate-900">AI 正在深度解析...</h3>
              <p className="text-slate-400 font-bold uppercase tracking-widest">正在识别处方笺/药盒关键字段</p>
            </div>
          </div>
        );
      case 'BASIC':
        return (
          <div className="flex-1 overflow-y-auto px-10 py-12 space-y-12 custom-scrollbar">
            <section className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                  <Info size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">药品档案核对 {isReplacing && " (替换新药)"}</h3>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 block">Step 1: Core Identification</span>
                </div>
              </div>

              {medication && !isReplacing && (
                <button 
                  onClick={() => setIsReplacing(true)}
                  className="w-full p-6 bg-orange-50 border-2 border-orange-200 rounded-[2rem] text-orange-600 flex items-center justify-center gap-4 hover:bg-orange-100 transition-all font-black text-sm uppercase tracking-widest mt-4"
                >
                  <RefreshCcw size={20} /> 转为“换药/替换”模式
                </button>
              )}
              
              <div className="space-y-8 bg-slate-50/50 p-10 rounded-[3rem] border border-slate-100">
                {previewImage && (
                  <div className="relative group rounded-3xl overflow-hidden aspect-video border-4 border-white shadow-xl">
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => setPreviewImage(null)}
                      className="absolute top-4 right-4 p-3 bg-red-500 text-white rounded-2xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                )}
                
                <InputWrapper label="药品名称" description="请输入药品全称">
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white border-2 border-slate-200 rounded-2xl p-5 text-2xl font-black text-slate-900 focus:border-blue-500 focus:ring-0 transition-all shadow-sm placeholder:text-slate-200"
                    placeholder="例如：阿司匹林肠溶片"
                  />
                </InputWrapper>

                <div className="grid grid-cols-2 gap-8">
                  <InputWrapper label="包装规格" description="规格参数 (如 100mg)">
                    <input
                      required
                      type="text"
                      value={formData.dosage}
                      onChange={e => setFormData({ ...formData, dosage: e.target.value })}
                      className="w-full bg-white border-2 border-slate-200 rounded-2xl p-5 text-xl font-bold text-slate-700 focus:border-blue-500 transition-all"
                      placeholder="100mg / 10ml"
                    />
                  </InputWrapper>
                  <InputWrapper label="药品分类" description="用途说明 (如 降压)">
                    <input
                      required
                      type="text"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-white border-2 border-slate-200 rounded-2xl p-5 text-xl font-bold text-slate-700 focus:border-blue-500 transition-all"
                      placeholder="用途分类"
                    />
                  </InputWrapper>
                </div>
              </div>
            </section>
          </div>
        );
      case 'SCHEDULE':
        return (
          <div className="flex-1 overflow-y-auto px-10 py-12 space-y-12 custom-scrollbar">
            <section className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-600 text-white rounded-2xl shadow-lg shadow-orange-100">
                  <Clock size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">用药动作部署</h3>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 block">Step 2: Administration Logic</span>
                </div>
              </div>
              
              <div className="bg-slate-900 text-white p-10 rounded-[3.5rem] shadow-2xl space-y-10 border border-slate-800">
                <div className="grid grid-cols-2 gap-8">
                  <InputWrapper label="单次服用剂量" description="每次服用的数量">
                    <div className="flex items-center gap-4">
                      <input
                        required
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={formData.dosagePerTime}
                        onChange={e => setFormData({ ...formData, dosagePerTime: parseFloat(e.target.value) })}
                        className="flex-1 bg-slate-800 border-none rounded-2xl p-4 text-2xl font-black text-blue-400 focus:ring-4 focus:ring-blue-500/20 text-center"
                      />
                      <select
                        value={formData.unit}
                        onChange={e => setFormData({ ...formData, unit: e.target.value })}
                        className="bg-slate-800 text-xl font-black text-slate-400 border-none rounded-2xl p-4 focus:ring-0 cursor-pointer"
                      >
                        <option value="片">片</option>
                        <option value="粒">粒</option>
                        <option value="袋">袋</option>
                        <option value="ml">ml</option>
                        <option value="g">g</option>
                      </select>
                    </div>
                  </InputWrapper>
                  <InputWrapper label="每日给药频次" description="全天给药次数">
                    <select
                      value={formData.frequency}
                      onChange={e => setFormData({ ...formData, frequency: e.target.value as any })}
                      className="w-full bg-slate-800 border-none rounded-2xl p-5 text-xl font-bold text-white focus:ring-4 focus:ring-blue-500/20 cursor-pointer"
                    >
                      <option value="daily">每日固定 1 次</option>
                      <option value="twice_daily">每日固定 2 次</option>
                      <option value="thrice_daily">每日固定 3 次</option>
                      <option value="custom">临床专家定义 (自定义)</option>
                    </select>
                  </InputWrapper>
                </div>

                <div className="space-y-6">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block ml-1">精确执行时刻管理 (系统提醒时间点)</label>
                  <div className="flex flex-wrap gap-4">
                    {formData.reminderTimes?.map((time, idx) => (
                      <div key={idx} className="flex items-center gap-4 bg-slate-800 p-4 pl-6 rounded-[1.5rem] border border-slate-700 group shadow-lg">
                        <input
                          type="time"
                          value={time}
                          onChange={e => handleUpdateTime(idx, e.target.value)}
                          className="bg-transparent border-none text-blue-400 font-black text-2xl p-0 focus:ring-0 cursor-pointer"
                        />
                        <button type="button" onClick={() => handleRemoveTime(idx)} className="p-2 bg-slate-700/50 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-xl transition-all">
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={handleAddTime} className="px-8 py-4 border-2 border-dashed border-slate-700 rounded-[1.5rem] text-slate-400 text-sm font-black hover:bg-slate-800 hover:border-blue-500 hover:text-blue-400 transition-all uppercase tracking-widest">
                      + 新增时刻
                    </button>
                  </div>
                </div>

                <InputWrapper label="辅助用药说明" description="临床方案备注">
                  <input
                    type="text"
                    value={formData.notes || ''}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-slate-800 border-none rounded-2xl p-5 text-lg font-bold text-white focus:ring-4 focus:ring-blue-500/20 placeholder:text-slate-600"
                    placeholder="例如：饭后 30 分钟温水服用"
                  />
                </InputWrapper>
              </div>
            </section>
          </div>
        );
      case 'STOCK':
        return (
          <div className="flex-1 overflow-y-auto px-10 py-12 space-y-12 custom-scrollbar">
            <section className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-600 text-white rounded-2xl shadow-lg shadow-green-100">
                  <Package size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">库存储备配置</h3>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 block">Step 3: Inventory Rules</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-8 bg-slate-50/50 p-10 rounded-[3rem] border border-slate-100">
                <div className="col-span-2 space-y-6">
                   <div className="flex gap-4">
                      <button 
                        onClick={() => setRefillType('refill')}
                        className={cn(
                          "flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 transition-all",
                          refillType === 'refill' ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        日常补药
                      </button>
                      <button 
                        onClick={() => setRefillType('renewal')}
                        className={cn(
                          "flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 transition-all",
                          refillType === 'renewal' ? "bg-green-600 border-green-600 text-white" : "bg-white border-slate-200 text-slate-400"
                        )}
                      >
                        处方续方
                      </button>
                   </div>
                   <InputWrapper label={refillType === 'refill' ? "本次补药量" : "新处方总量"} description="增加的库存数">
                      <div className="flex items-center gap-4">
                        <input
                          type="number"
                          value={refillAmount}
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            setRefillAmount(val);
                            if (medication) {
                              setFormData(prev => ({ ...prev, stock: (medication.stock || 0) + val }));
                            }
                          }}
                          className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 text-2xl font-black text-slate-900 focus:border-blue-500 text-center"
                        />
                      </div>
                   </InputWrapper>
                </div>

                <InputWrapper label="剩余总量(核对)" description="当前库存确认">
                  <div className="flex items-center gap-4">
                    <input
                      required
                      type="number"
                      value={formData.stock}
                      onChange={e => setFormData({ ...formData, stock: parseFloat(e.target.value) })}
                      className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 text-2xl font-black text-slate-900 focus:border-green-500 transition-all text-center"
                    />
                    <span className="text-lg font-black text-slate-400 italic uppercase">{formData.unit}</span>
                  </div>
                </InputWrapper>
                <InputWrapper label="红色警告阈值" description="极低库存警报阈值">
                  <div className="flex items-center gap-4">
                    <input
                      required
                      type="number"
                      value={formData.threshold}
                      onChange={e => setFormData({ ...formData, threshold: parseFloat(e.target.value) })}
                      className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 text-2xl font-black text-slate-900 focus:border-red-500 transition-all text-center"
                    />
                    <span className="text-lg font-black text-slate-400 italic uppercase">{formData.unit}</span>
                  </div>
                </InputWrapper>

                <div className="col-span-2 pt-8 border-t border-slate-200">
                   <div className="flex items-center justify-between p-8 bg-white border border-slate-100 rounded-[2rem]">
                      <div className="flex items-center gap-6">
                        <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                          <PlusCircle size={28} />
                        </div>
                        <div>
                          <span className="text-xl font-black text-slate-900 block">长期服药计划</span>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Auto-Extend Protocol</span>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, isLongTerm: !prev.isLongTerm }))}
                        className={cn(
                          "w-20 h-10 rounded-full transition-all relative p-1",
                          formData.isLongTerm ? "bg-blue-600" : "bg-slate-200"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 bg-white rounded-full transition-all",
                          formData.isLongTerm ? "ml-10" : "ml-0"
                        )} />
                      </button>
                   </div>
                </div>

                {!formData.isLongTerm && (
                  <div className="col-span-2">
                    <InputWrapper label="方案截止日期" description="停止服药日期">
                      <input
                        type="date"
                        value={formData.endDate?.split('T')[0]}
                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full bg-white border-2 border-slate-200 rounded-2xl p-5 text-xl font-bold text-slate-700"
                      />
                    </InputWrapper>
                  </div>
                )}
              </div>
            </section>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2rem] sm:rounded-[4rem] w-full max-w-2xl h-[95dvh] sm:h-[85vh] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] flex flex-col relative"
      >
        <header className="px-12 py-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div>
             <div className="flex items-center gap-3">
               {step !== 'CHOICE' && !medication && (
                 <button 
                   onClick={() => setStep(step === 'BASIC' ? 'CHOICE' : step === 'SCHEDULE' ? 'BASIC' : 'SCHEDULE')} 
                   className="p-2 hover:bg-slate-200 rounded-xl transition-all"
                 >
                   <ChevronLeft size={24} className="text-slate-500" />
                 </button>
               )}
               <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                 {medication ? '修改方案' : step === 'CHOICE' ? '添加药品' : '配置新计划'}
               </h2>
             </div>
          </div>
          <button onClick={onClose} className="p-4 hover:bg-slate-200/50 rounded-3xl transition-all">
            <X size={32} className="text-slate-400" />
          </button>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              className="flex-1 flex flex-col overflow-hidden"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {step !== 'CHOICE' && step !== 'ANALYZE' && (
          <footer className="px-12 py-10 border-t border-slate-50 flex justify-between items-center bg-white shrink-0">
            {medication ? (
              <button
                 type="button"
                 onClick={() => {
                   if (confirm('确定要停用并删除该药品计划吗？')) {
                     deleteMedication(medication.id);
                     onClose();
                   }
                 }}
                 className="flex items-center gap-2 text-red-500 font-bold text-sm hover:bg-red-50 px-6 py-3 rounded-2xl transition-all"
              >
                <Trash2 size={24} />
                停用方案
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-6">
              {step !== 'STOCK' ? (
                <button
                  onClick={() => setStep(step === 'BASIC' ? 'SCHEDULE' : 'STOCK')}
                  className="flex items-center gap-3 px-10 py-5 bg-blue-600 text-white rounded-[2rem] text-lg font-black shadow-2xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all group"
                >
                  下一步
                  <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-3 px-12 py-5 bg-green-600 text-white rounded-[2rem] text-lg font-black shadow-2xl shadow-green-200 hover:bg-green-700 active:scale-95 transition-all"
                >
                  <CheckCircle2 size={24} />
                  完成并生效
                </button>
              )}
            </div>
          </footer>
        )}
      </motion.div>
    </div>
  );
}

function InputWrapper({ label, children, description }: { label: string; children: React.ReactNode; description?: string }) {
  return (
    <div className="space-y-3 flex flex-col">
      <div className="flex flex-col ml-1">
        <label className="text-lg font-black text-slate-900 tracking-tight">{label}</label>
        {description && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60">{description}</span>}
      </div>
      {children}
    </div>
  );
}
