/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useStore } from '../store';

export type EventName = 
  | 'home_viewed'
  | 'medicine_list_viewed'
  | 'history_viewed'
  | 'followup_viewed'
  | 'medicine_added'
  | 'medication_checked_in'
  | 'medication_skipped'
  | 'stock_updated'
  | 'low_stock_warning_triggered'
  | 'followup_added'
  | 'patient_logged_in'
  | 'caregiver_logged_in'
  | 'caregiver_switched_patient'
  | 'caregiver_marked_proxy_checkin'
  | 'patient_medication_checked_in'
  | 'caregiver_updated_stock_for_patient'
  | 'caregiver_viewed_adherence'
  | 'medication_replaced'
  | 'caregiver_refilled_stock'
  | 'caregiver_renewed_prescription';

export function trackEvent(name: EventName, payload?: Record<string, any>) {
  const { trackEvent: storeTrack } = useStore.getState();
  
  console.log(`[Analytics] ${name}`, payload);
  storeTrack(name, payload);
}
