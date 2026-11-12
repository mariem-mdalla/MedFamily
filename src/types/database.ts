export type UserRole = 'admin' | 'member';

export type Profile = {
  id: string;
  family_id: string;
  role: UserRole;
  display_name: string;
  language: 'fr' | 'ar';
  large_text: boolean;
  high_contrast: boolean;
  voice_enabled: boolean;
};

export type CareProfile = {
  id: string;
  family_id: string;
  display_name: string;
  label: string | null;
  color: string;
  linked_user_id: string | null;
};

export type Medication = {
  id: string;
  family_id: string;
  care_profile_id: string;
  name: string;
  instructions: string;
  stock_quantity: number;
  low_stock_threshold: number;
  expiry_date: string | null;
};

export type Schedule = {
  id: string;
  family_id: string;
  medication_id: string;
  time_local: string;
  weekdays: number[];
  timezone: string;
};

export type MedicationWithSchedules = Medication & {
  schedules: Schedule[];
};

export type DoseStatus = 'taken' | 'skipped';

export type DoseLog = {
  id: string;
  schedule_id: string | null;
  family_id: string;
  care_profile_id: string;
  occurrence_date: string;
  time_local: string;
  status: DoseStatus;
  recorded_by: string | null;
  medicine_name: string;
  instructions: string;
  recorded_at: string;
};
