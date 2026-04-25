/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'patient' | 'caregiver';

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar?: string;
  patientCode?: string;
}

export interface CareRelation {
  caregiverId: string;
  patientId: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  unit: string;
  frequency: 'daily' | 'twice_daily' | 'thrice_daily' | 'custom';
  dosagePerTime: number;
  stock: number;
  threshold: number;
  reminderTimes: string[];
  startDate: string;
  endDate?: string;
  status: 'active' | 'archived' | 'replaced';
  notes?: string;
  imageUrl?: string;
  category?: string;
  isLongTerm: boolean;
  requiresRefillReminder: boolean;
  patientId: string;
  replacedMedId?: string; // ID of the medication that replaced this one
  replacesMedId?: string; // ID of the medication this one replaced
}

export interface RefillRecord {
  id: string;
  medId: string;
  date: string;
  amount: number;
  type: 'refill' | 'renewal'; // refill (补药) vs renewal (续方)
  notes?: string;
}

export type IntakeStatus = 'pending' | 'taken' | 'skipped';

export interface IntakeRecord {
  id: string;
  medId: string;
  medName: string;
  scheduledTime: string; // "HH:mm"
  date: string; // "YYYY-MM-DD"
  status: IntakeStatus;
  actualTime?: string;
  patientId: string;
  confirmedBy?: string; // UID of user
  isProxy?: boolean; // confirmed by caregiver
}

export interface FollowUp {
  id: string;
  doctorName: string;
  department: string;
  appointmentDate: string;
  notes?: string;
}

export interface AnalyticsEvent {
  id: string;
  name: string;
  timestamp: string;
  payload?: Record<string, any>;
}
