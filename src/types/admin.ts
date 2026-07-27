export interface Employee {
  id: string;
  user_id?: string | null;
  full_name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  job_title: string;
  seniority: string;
  city?: string | null;
  country?: string | null;
  education?: string | null;
  salary_amount: number;
  salary_currency: string;
  employment_type: string;
  joining_date: string;
  status: string;
  skills: string[];
  notes?: string | null;
  created_at: string;
  assigned_clients_count?: number;
}

export interface JobTitle {
  id: string;
  title: string;
  category: string;
}
