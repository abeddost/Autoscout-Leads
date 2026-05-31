export type CarLeadStatus = 'new' | 'reviewed' | 'contacted' | 'closed'

export interface CarLead {
  id: string
  created_at: string
  date_found: string
  listing_date: string | null
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

export type CarLeadInsert = Omit<CarLead, 'id' | 'created_at'>
export type CarLeadUpdate = Partial<CarLeadInsert>
export type SearchLogInsert = Omit<SearchLog, 'id' | 'created_at'>

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
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
