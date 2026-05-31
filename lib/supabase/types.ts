export type CarLeadStatus = 'new' | 'reviewed' | 'contacted' | 'closed'
export type ScrapeJobStatus = 'queued' | 'scraping' | 'analyzing' | 'completed' | 'failed'
export type ScrapeJobItemStatus = 'pending' | 'processing' | 'skipped' | 'saved' | 'failed'

export interface CarLead {
  id: string
  created_at: string
  date_found: string
  seller_name: string | null
  seller_mobile: string | null
  seller_email: string | null
  plz: string | null
  city: string | null
  vehicle_title: string
  brand: string
  model: string
  year: number | null
  mileage: number | null
  fuel_type: string | null
  transmission: string | null
  horsepower: number | null
  price: number
  estimated_market_value: number | null
  potential_profit: number | null
  deal_score: number | null
  risk_score: number | null
  seller_type: string
  accident_info: string | null
  number_of_owners: number | null
  equipment: string[]
  listing_url: string
  image_urls: string[]
  ai_summary: string | null
  ai_recommendation: string | null
  pdf_url: string | null
  source_website: string
  status: CarLeadStatus
}

export interface SearchLog {
  id: string
  created_at: string
  search_date: string
  source_website: string
  total_listings_checked: number
  total_leads_saved: number
  errors: string[]
}

export interface ScrapeJob {
  id: string
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
  created_by: string | null
  source_website: string
  status: ScrapeJobStatus
  checked_count: number
  candidate_count: number
  processed_count: number
  saved_count: number
  failed_count: number
  latest_error: string | null
  errors: string[]
}

export interface ScrapeJobItem {
  id: string
  created_at: string
  updated_at: string
  job_id: string
  listing_url: string
  raw_listing: unknown
  status: ScrapeJobItemStatus
  saved_lead_id: string | null
  error: string | null
  analyzed_at: string | null
}

export type CarLeadInsert = Omit<CarLead, 'id' | 'created_at'>
export type CarLeadUpdate = Partial<CarLeadInsert>
export type SearchLogInsert = Omit<SearchLog, 'id' | 'created_at'>
export type ScrapeJobInsert = Partial<Omit<ScrapeJob, 'id' | 'created_at' | 'updated_at'>>
export type ScrapeJobUpdate = Partial<ScrapeJobInsert>
export type ScrapeJobItemInsert = Partial<Omit<ScrapeJobItem, 'id' | 'created_at' | 'updated_at'>>
export type ScrapeJobItemUpdate = Partial<ScrapeJobItemInsert>

export interface Database {
  public: {
    Tables: {
      car_leads: {
        Row: CarLead
        Insert: CarLeadInsert
        Update: CarLeadUpdate
        Relationships: {
          foreignKeyName: string
          columns: string[]
          isOneToOne: boolean
          referencedRelation: string
          referencedColumns: string[]
        }[]
      }
      search_logs: {
        Row: SearchLog
        Insert: SearchLogInsert
        Update: Partial<SearchLogInsert>
        Relationships: {
          foreignKeyName: string
          columns: string[]
          isOneToOne: boolean
          referencedRelation: string
          referencedColumns: string[]
        }[]
      }
      scrape_jobs: {
        Row: ScrapeJob
        Insert: ScrapeJobInsert
        Update: ScrapeJobUpdate
        Relationships: {
          foreignKeyName: string
          columns: string[]
          isOneToOne: boolean
          referencedRelation: string
          referencedColumns: string[]
        }[]
      }
      scrape_job_items: {
        Row: ScrapeJobItem
        Insert: ScrapeJobItemInsert
        Update: ScrapeJobItemUpdate
        Relationships: {
          foreignKeyName: string
          columns: string[]
          isOneToOne: boolean
          referencedRelation: string
          referencedColumns: string[]
        }[]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
