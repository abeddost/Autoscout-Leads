import type { RawListing, ScrapeResult } from './types'

const BRANDS = [
  'bmw',
  'mercedes-benz',
  'audi',
  'porsche',
  'lexus',
  'jaguar',
  'volvo',
  'volkswagen',
  'cupra',
]

const PRICE_FROM = 20000
const PRICE_TO = 70000
const ZIP_CODE = '55294'
const RADIUS_KM = 100
const MAX_PAGES = 5
const BASE_URL = 'https://www.autoscout24.de'

function buildSearchUrl(brand: string, page: number): string {
  const params = new URLSearchParams({
    sort: 'age',
    desc: '1',
    pricefrom: String(PRICE_FROM),
    priceto: String(PRICE_TO),
    zipc: ZIP_CODE,
    zip_distance: String(RADIUS_KM),
    size: '20',
    page: String(page),
    atype: 'private',
  })
  return `${BASE_URL}/lst/${brand}?${params.toString()}`
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function randomDelay() {
  return delay(1200 + Math.random() * 1000)
}

// Extract number from a string like "130 kW (177 PS)"
function parseHorsepower(str: string | null | undefined): number | null {
  if (!str) return null
  const match = str.match(/(\d+)\s*PS/i) || str.match(/(\d+)\s*hp/i)
  return match ? parseInt(match[1], 10) : null
}

function parsePrice(str: string | null | undefined): number | null {
  if (!str) return null
  const cleaned = str.replace(/[^\d,.-]/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function parseMileage(str: string | null | undefined): number | null {
  if (!str) return null
  const match = str.match(/([\d.]+)\s*km/i)
  if (!match) return null
  return parseInt(match[1].replace(/\./g, ''), 10)
}

function extractYearFromTitle(title: string): number | null {
  const match = title.match(/\b(19|20)\d{2}\b/)
  return match ? parseInt(match[0], 10) : null
}

// Parse listing data from AutoScout24 __NEXT_DATA__ JSON
function parseNextData(data: Record<string, unknown>, listingUrl: string): RawListing | null {
  try {
    // Navigate the typical AutoScout24 Next.js data structure
    const props = data?.props as Record<string, unknown> | undefined
    const pageProps = props?.pageProps as Record<string, unknown> | undefined
    const listing = (pageProps?.listing || pageProps?.details) as Record<string, unknown> | undefined

    if (!listing) return null

    const vehicle = listing.vehicle as Record<string, unknown> | undefined
    const seller = listing.seller as Record<string, unknown> | undefined
    const location = listing.location as Record<string, unknown> | undefined

    const make = (vehicle?.make as string) || ''
    const modelStr = (vehicle?.model as string) || ''
    const title = `${make} ${modelStr}`.trim() || (listing.title as string) || ''
    const year = (vehicle?.constructionYear as number) || extractYearFromTitle(title)
    const priceRaw = (listing.price as number) || parsePrice(String(listing.priceRaw || ''))
    if (!priceRaw || priceRaw < PRICE_FROM || priceRaw > PRICE_TO) return null

    const mileageRaw = vehicle?.mileageInKmRaw as number | null
    const fuelType = (vehicle?.fuelCategory as { label?: string } | null)?.label ?? null
    const transmissionRaw = vehicle?.transmissionType as string | null
    const hpRaw = vehicle?.powerInHp as number | null || parseHorsepower(vehicle?.powerDisplay as string)
    const plz = (location?.zip as string) || (location?.postalCode as string) || null
    const city = (location?.city as string) || null

    const sellerName =
      (seller?.name as string) ||
      (seller?.company as string) ||
      (seller?.firstName as string) ||
      null
    const sellerPhone = (seller?.phone as string) || (seller?.mobile as string) || null
    const sellerEmail = (seller?.email as string) || null
    const sellerType = 'private' // filtered at URL level

    const accidentData = vehicle?.accidentFree
    const accidentInfo = accidentData === true
      ? 'Accident-free'
      : accidentData === false
      ? 'Accident reported'
      : (vehicle?.damageCondition as string) || null

    const owners = vehicle?.numberOfPreviousOwners as number | null

    const equipmentList = (vehicle?.equipmentCategories as Array<{ label?: string; entries?: string[] }>)
      ?.flatMap((c) => c.entries || (c.label ? [c.label] : [])) || []

    const images = (listing.images as Array<{ urls?: { main?: string } }>)
      ?.map((img) => img?.urls?.main || '')
      .filter(Boolean) || []

    return {
      listing_url: listingUrl,
      vehicle_title: title,
      brand: make,
      model: modelStr,
      year,
      price: priceRaw,
      mileage: mileageRaw ?? parseMileage(String(vehicle?.mileageDisplay || '')),
      fuel_type: fuelType,
      transmission: transmissionRaw,
      horsepower: hpRaw,
      plz,
      city,
      seller_name: sellerName,
      seller_mobile: sellerPhone,
      seller_email: sellerEmail,
      seller_type: sellerType,
      accident_info: accidentInfo,
      number_of_owners: owners ?? null,
      equipment: equipmentList.slice(0, 30),
      image_urls: images.slice(0, 10),
      source_website: 'autoscout24',
    }
  } catch {
    return null
  }
}

// Fallback: parse listing data directly from HTML/DOM using Playwright page evaluation
async function parseListingFromPage(
  page: import('playwright-core').Page,
  url: string
): Promise<RawListing | null> {
  try {
    // Try to extract from __NEXT_DATA__ first
    const nextDataJson = await page.evaluate(() => {
      const el = document.getElementById('__NEXT_DATA__')
      return el ? el.textContent : null
    })

    if (nextDataJson) {
      const parsed = JSON.parse(nextDataJson) as Record<string, unknown>
      const result = parseNextData(parsed, url)
      if (result) return result
    }

    // DOM fallback
    const data = await page.evaluate(() => {
      const getText = (sel: string) =>
        document.querySelector(sel)?.textContent?.trim() || null

      const title = getText('h1') || getText('[data-testid="listing-title"]') || ''
      const priceEl = getText('[data-testid="price-label"]') ||
        getText('.cldt-price') ||
        getText('[class*="price"]')

      const makeEl = getText('[data-testid="make"]')
      const modelEl = getText('[data-testid="model"]')

      const images = Array.from(
        document.querySelectorAll('[data-testid="gallery-img"], .image-gallery img, [class*="gallery"] img')
      )
        .map((el) => (el as HTMLImageElement).src || (el as HTMLImageElement).dataset.src || '')
        .filter((s) => s.startsWith('http'))
        .slice(0, 10)

      return { title, priceEl, makeEl, modelEl, images }
    })

    const price = parsePrice(data.priceEl)
    if (!price || price < PRICE_FROM || price > PRICE_TO) return null

    const titleStr = data.title || `${data.makeEl || ''} ${data.modelEl || ''}`.trim()

    return {
      listing_url: url,
      vehicle_title: titleStr,
      brand: data.makeEl || '',
      model: data.modelEl || '',
      year: extractYearFromTitle(titleStr),
      price,
      mileage: null,
      fuel_type: null,
      transmission: null,
      horsepower: null,
      plz: null,
      city: null,
      seller_name: null,
      seller_mobile: null,
      seller_email: null,
      seller_type: 'private',
      accident_info: null,
      number_of_owners: null,
      equipment: [],
      image_urls: data.images,
      source_website: 'autoscout24',
    }
  } catch {
    return null
  }
}

export async function scrapeAutoScout24(): Promise<ScrapeResult> {
  const listings: RawListing[] = []
  const errors: string[] = []
  let checked = 0
  const seenUrls = new Set<string>()

  // Import playwright dynamically to support both local and Vercel environments
  let browser: import('playwright-core').Browser | null = null

  try {
    let executablePath: string | undefined
    let launchArgs: string[] = []

    if (process.env.AWS_LAMBDA_FUNCTION_VERSION || process.env.VERCEL) {
      // Vercel / Lambda environment — use @sparticuz/chromium-min (no bundled binary)
      // Binary is downloaded at runtime from GitHub Releases
      const chromium = await import('@sparticuz/chromium-min').then((m) => m.default || m)
      executablePath = await chromium.executablePath(
        'https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.tar'
      )
      launchArgs = chromium.args as string[]
    }

    const { chromium: playwrightChromium } = await import('playwright-core')

    browser = await playwrightChromium.launch({
      executablePath,
      args: launchArgs.length
        ? launchArgs
        : [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
          ],
      headless: true,
    })

    for (const brand of BRANDS) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const url = buildSearchUrl(brand, page)

        try {
          const ctx = await browser.newContext({
            userAgent:
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            locale: 'de-DE',
            viewport: { width: 1280, height: 900 },
          })
          const searchPage = await ctx.newPage()

          // Block images/fonts to speed up search pages
          await searchPage.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf}', (r) => r.abort())

          await searchPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
          await randomDelay()

          // Extract listing URLs from search results page
          const listingUrls: string[] = await searchPage.evaluate(() => {
            const links = Array.from(
              document.querySelectorAll('a[href*="/angebote/"]')
            ) as HTMLAnchorElement[]
            return [...new Set(links.map((a) => a.href))].filter(
              (h) => h.includes('/angebote/')
            )
          })

          await ctx.close()

          if (listingUrls.length === 0) break // No more results for this brand

          // Visit each listing detail page
          for (const listingUrl of listingUrls) {
            const cleanUrl = listingUrl.split('?')[0]
            if (seenUrls.has(cleanUrl)) continue
            seenUrls.add(cleanUrl)
            checked++

            try {
              const detailCtx = await browser.newContext({
                userAgent:
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                locale: 'de-DE',
              })
              const detailPage = await detailCtx.newPage()
              await detailPage.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
              await randomDelay()

              const listing = await parseListingFromPage(detailPage, cleanUrl)
              if (listing && listing.price >= PRICE_FROM && listing.price <= PRICE_TO) {
                listings.push(listing)
              }

              await detailCtx.close()
            } catch (err) {
              errors.push(`Detail page error ${cleanUrl}: ${String(err)}`)
            }
          }
        } catch (err) {
          errors.push(`Search page error ${url}: ${String(err)}`)
        }
      }
    }
  } finally {
    await browser?.close()
  }

  return { listings, checked, errors }
}
