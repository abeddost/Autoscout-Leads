import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadTsModule(relativePath) {
  const filename = resolve(rootDir, relativePath)
  const source = readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText

  const module = { exports: {} }
  const localRequire = (id) => {
    throw new Error(`Unexpected runtime import in fixture module: ${id}`)
  }

  new Function('exports', 'module', 'require', '__filename', '__dirname', output)(
    module.exports,
    module,
    localRequire,
    filename,
    dirname(filename)
  )

  return module.exports
}

const { estimateMarketValuation } = loadTsModule('lib/valuation/market.ts')
const { getValuationConfidenceLabel } = loadTsModule('lib/valuation/confidence.ts')

function listing(overrides = {}) {
  return {
    listing_url: `https://example.test/${Math.random().toString(36).slice(2)}`,
    vehicle_title: 'Audi A6 40 TDI S tronic',
    brand: 'Audi',
    model: 'A6',
    year: 2020,
    price: 25000,
    mileage: 72000,
    fuel_type: 'Diesel',
    transmission: 'Automatic',
    horsepower: 204,
    plz: '55294',
    city: 'Bodenheim',
    seller_name: 'Private seller',
    seller_mobile: '+491701234567',
    seller_email: null,
    seller_type: 'private',
    accident_info: 'Accident-free',
    number_of_owners: 1,
    equipment: [],
    image_urls: [],
    source_website: 'autoscout24',
    listing_date: null,
    market_price_rating: 1,
    ...overrides,
  }
}

function comparable(price, overrides = {}) {
  return listing({
    price,
    market_price_rating: 2,
    ...overrides,
  })
}

{
  const target = listing({ price: 25000 })
  const result = estimateMarketValuation(target, [
    target,
    comparable(30000, { mileage: 70000 }),
    comparable(31000, { mileage: 76000 }),
    comparable(29500, { year: 2019 }),
    comparable(30500, { horsepower: 190 }),
    comparable(32000, { mileage: 68000 }),
    comparable(29800, { year: 2021 }),
    comparable(30700, { horsepower: 210 }),
  ])

  assert.equal(result.valuation_confidence, 'strong')
  assert.equal(result.comparable_count, 7)
  assert.ok(result.estimated_market_value >= 30000 && result.estimated_market_value <= 31000)
  assert.ok(result.deal_score >= 80)
}

{
  const target = listing({ price: 25000 })
  const result = estimateMarketValuation(target, [
    target,
    comparable(31000, { mileage: 74000 }),
  ])

  assert.equal(result.valuation_confidence, 'weak')
  assert.equal(result.comparable_count, 1)
  assert.ok(result.deal_score <= 74)
}

{
  const target = listing({ price: 25000 })
  const result = estimateMarketValuation(target, [
    target,
    comparable(30000),
    comparable(30200),
    comparable(30500),
    comparable(30800),
    comparable(31000),
    comparable(29500),
    comparable(90000),
  ])

  assert.equal(result.valuation_confidence, 'strong')
  assert.equal(result.comparable_count, 6)
  assert.ok(result.comparable_price_max < 90000)
  assert.ok(result.estimated_market_value < 40000)
}

{
  const target = listing({ price: 25000, fuel_type: 'Diesel', transmission: 'Automatic' })
  const result = estimateMarketValuation(target, [
    target,
    comparable(31000, { fuel_type: 'Petrol', transmission: 'Automatic' }),
    comparable(31500, { fuel_type: 'Diesel', transmission: 'Manual' }),
    comparable(30500, { fuel_type: 'Diesel', transmission: 'Automatic' }),
  ])

  assert.equal(result.valuation_confidence, 'weak')
  assert.equal(result.comparable_count, 1)
  assert.equal(result.comparable_median_price, 30500)
}

{
  assert.equal(getValuationConfidenceLabel('legacy'), 'Legacy valuation')
  assert.equal(getValuationConfidenceLabel(null), 'Legacy valuation')
}

console.log('Valuation fixture scenarios passed')
