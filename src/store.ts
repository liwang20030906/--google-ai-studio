/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Medication, IntakeRecord, FollowUp, AnalyticsEvent, User, Role } from './types';
import { format } from 'date-fns';

interface AppState {
  currentUser: User | null;
  selectedPatientId: string | null;
  medications: Medication[];
  records: IntakeRecord[];
  followUps: FollowUp[];
  events: AnalyticsEvent[];
  patients: User[];
  globalUsers: User[]; // Simulated backend registry
  
  // Actions
  login: (role: Role, name: string) => void;
  logout: () => void;
  switchPatient: (patientId: string) => void;
  addPatient: (name: string) => void;
  linkPatientByCode: (code: string) => void;
  addMedication: (med: Medication) => void;
  replaceMedication: (oldMedId: string, newMedData: Medication) => void;
  refillStock: (medId: string, amount: number, type: 'refill' | 'renewal') => void;
  updateMedication: (medId: string, updates: Partial<Medication>) => void;
  deleteMedication: (medId: string) => void;
  takeMedication: (recordId: string, isProxy?: boolean) => void;
  updateStock: (medId: string, amount: number) => void;
  syncTodayRecords: (patientId: string) => void;
  skipMedication: (recordId: string) => void;
  addFollowUp: (followUp: FollowUp) => void;
  trackEvent: (name: string, payload?: Record<string, any>) => void;
}

const DEFAULT_PATIENT_ID = 'p1';

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      selectedPatientId: null,
      medications: [
        {
          id: 'med1',
          name: '阿司匹林肠溶片',
          dosage: '100mg*30片',
          unit: '片',
          frequency: 'daily',
          dosagePerTime: 1,
          stock: 8,
          threshold: 10,
          reminderTimes: ['08:00'],
          startDate: new Date().toISOString(),
          status: 'active',
          notes: '餐后服用，预防心血管疾病',
          category: '心血管',
          isLongTerm: true,
          requiresRefillReminder: true,
          patientId: DEFAULT_PATIENT_ID,
          imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop'
        },
        {
          id: 'med2',
          name: '苯磺酸氨氯地平片',
          dosage: '5mg*28片',
          unit: '片',
          frequency: 'daily',
          dosagePerTime: 1,
          stock: 25,
          threshold: 7,
          reminderTimes: ['08:00'],
          startDate: new Date().toISOString(),
          status: 'active',
          notes: '每日早晨固定时间服用，管理血压',
          category: '降压',
          isLongTerm: true,
          requiresRefillReminder: true,
          patientId: DEFAULT_PATIENT_ID,
          imageUrl: 'https://images.unsplash.com/photo-1628771065518-0d82f1958462?w=200&h=200&fit=crop'
        }
      ],
      records: [],
      followUps: [
        {
          id: 'fu1',
          doctorName: '张主任',
          department: '心内科',
          appointmentDate: new Date(Date.now() + 86400000 * 5).toISOString(), // 5天后
          notes: '请携带最近一周的家庭血压测量记录记录本'
        }
      ],
      events: [],
      patients: [],
      globalUsers: [
        { id: 'p1', name: '王大爷', role: 'patient', patientCode: '888888' }
      ],

      login: (role, name) => {
        const id = Math.random().toString(36).substr(2, 9);
        let user: User = { id, name, role };
        
        if (role === 'patient') {
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          user.patientCode = code;
          
          set((state) => ({ 
            currentUser: user,
            selectedPatientId: user.id,
            globalUsers: [...state.globalUsers, user]
          }));
        } else {
          set((state) => {
            const initialPatients = state.patients.length > 0 ? state.patients : state.globalUsers.filter(u => u.id === 'p1');
            return { 
              currentUser: user,
              selectedPatientId: initialPatients[0]?.id || null,
              patients: initialPatients,
              globalUsers: [...state.globalUsers, user]
            };
          });
        }
        
        get().trackEvent(role === 'patient' ? 'patient_logged_in' : 'caregiver_logged_in', { name });
        if (user.id) get().syncTodayRecords(user.id);
      },

      logout: () => set({ currentUser: null, selectedPatientId: null }),

      switchPatient: (patientId) => {
        set({ selectedPatientId: patientId });
        get().trackEvent('caregiver_switched_patient', { patientId });
        get().syncTodayRecords(patientId);
      },

      addPatient: (name) => set((state) => {
        const newPatient: User = {
          id: Math.random().toString(36).substr(2, 9),
          name,
          role: 'patient',
          patientCode: Math.floor(100000 + Math.random() * 900000).toString()
        };
        get().trackEvent('caregiver_added_patient', { patientName: name, patientId: newPatient.id });
        return { 
          patients: [...state.patients, newPatient], 
          selectedPatientId: newPatient.id,
          globalUsers: [...state.globalUsers, newPatient]
        };
      }),

      linkPatientByCode: (code) => {
        const patient = get().globalUsers.find(u => u.patientCode === code);
        if (patient) {
          set((state) => ({
            patients: [...state.patients.filter(p => p.id !== patient.id), patient],
            selectedPatientId: patient.id
          }));
          get().trackEvent('caregiver_linked_patient_by_code', { code, patientId: patient.id });
        } else {
          throw new Error('未找到对应编码的老人');
        }
      },

      addMedication: (med) => {
        set((state) => ({ medications: [...state.medications, med] }));
        get().syncTodayRecords(med.patientId);
      },

      replaceMedication: (oldMedId, newMedData) => {
        set((state) => {
          const updatedMeds = state.medications.map(m => 
            m.id === oldMedId ? { ...m, status: 'replaced' as const, replacedMedId: newMedData.id } : m
          );
          const newMed = { ...newMedData, replacesMedId: oldMedId };
          get().trackEvent('caregiver_replaced_medication', { oldMedId, newMedId: newMedData.id });
          return { medications: [...updatedMeds, newMed] };
        });
        get().syncTodayRecords(newMedData.patientId);
      },

      refillStock: (medId, amount, type) => {
        set((state) => {
          const updatedMeds = state.medications.map(m => 
            m.id === medId ? { ...m, stock: m.stock + amount } : m
          );
          get().trackEvent(type === 'refill' ? 'caregiver_refilled_stock' : 'caregiver_renewed_prescription', { medId, amount });
          return { medications: updatedMeds };
        });
      },

      updateMedication: (medId, updates) => {
        set((state) => {
          const updatedMeds = state.medications.map(m => m.id === medId ? { ...m, ...updates } : m);
          const med = updatedMeds.find(m => m.id === medId);
          if (med) get().syncTodayRecords(med.patientId);
          return { medications: updatedMeds };
        });
      },

      deleteMedication: (medId) => set((state) => ({
        medications: state.medications.filter(m => m.id !== medId),
        records: state.records.filter(r => r.medId !== medId)
      })),
      
      takeMedication: (recordId, isProxy = false) => set((state) => {
        const record = state.records.find(r => r.id === recordId);
        if (!record || record.status !== 'pending') return state;

        const updatedRecords = state.records.map(r => 
          r.id === recordId ? { 
            ...r, 
            status: 'taken' as const, 
            actualTime: new Date().toISOString(),
            confirmedBy: state.currentUser?.id,
            isProxy: isProxy
          } : r
        );
        
        const med = state.medications.find(m => m.id === record.medId);
        if (med) {
          const updatedMeds = state.medications.map(m => 
            m.id === med.id ? { ...m, stock: Math.max(0, parseFloat((m.stock - m.dosagePerTime).toFixed(2))) } : m
          );
          
          if (isProxy) {
            get().trackEvent('caregiver_marked_proxy_checkin', { medId: med.id, recordId });
          } else {
            get().trackEvent('patient_medication_checked_in', { medId: med.id, recordId });
          }

          return { records: updatedRecords, medications: updatedMeds };
        }
        
        return { records: updatedRecords };
      }),

      skipMedication: (recordId) => set((state) => ({
        records: state.records.map(r => 
          r.id === recordId ? { ...r, status: 'skipped' as const } : r
        )
      })),

      updateStock: (medId, amount) => set((state) => {
        const med = state.medications.find(m => m.id === medId);
        if (med && state.currentUser?.role === 'caregiver') {
          get().trackEvent('caregiver_updated_stock_for_patient', { medId, amount });
        }
        return {
          medications: state.medications.map(m => m.id === medId ? { ...m, stock: m.stock + amount } : m)
        };
      }),

      syncTodayRecords: (patientId) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const state = get();
        const existingRecordsForToday = state.records.filter(r => r.date === today && r.patientId === patientId);
        
        const newRecords: IntakeRecord[] = [];
        
        state.medications.forEach(med => {
          if (med.status !== 'active' || med.patientId !== patientId) return;
          
          const startDate = format(new Date(med.startDate), 'yyyy-MM-dd');
          if (startDate > today) return;

          if (med.endDate) {
            const endDate = format(new Date(med.endDate), 'yyyy-MM-dd');
            if (endDate < today) return;
          }

          med.reminderTimes.forEach(time => {
            const exists = existingRecordsForToday.some(r => r.medId === med.id && r.scheduledTime === time);
            if (!exists) {
              newRecords.push({
                id: `rec_${med.id}_${time}_${today}`,
                medId: med.id,
                medName: med.name,
                scheduledTime: time,
                date: today,
                status: 'pending',
                patientId: patientId
              });
            }
          });
        });

        if (newRecords.length > 0) {
          set((state) => ({ records: [...state.records, ...newRecords] }));
        }
      },

      addFollowUp: (fu) => set((state) => ({ followUps: [...state.followUps, fu] })),

      trackEvent: (name, payload) => set((state) => ({ 
        events: [{ id: Math.random().toString(36).substr(2, 9), name, timestamp: new Date().toISOString(), payload }, ...state.events].slice(0, 1000) 
      })),
    }),
    {
      name: 'chronic-care-store-v2',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
