export interface RawListing {
  listing_url: string
  vehicle_title: string
  brand: string
  model: string
  year: number | null
  price: number
  mileage: number | null
  fuel_type: string | null
  transmission: string | null
  horsepower: number | null
  plz: string | null
  city: string | null
  seller_name: string | null
  seller_mobile: string | null
  seller_email: string | null
  seller_type: string
  accident_info: string | null
  number_of_owners: number | null
  equipment: string[]
  image_urls: string[]
  source_website: string
  market_price_rating?: number | null
}

export interface ScrapeResult {
  listings: RawListing[]
  checked: number
  errors: string[]
}
