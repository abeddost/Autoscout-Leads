import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Link,
} from '@react-pdf/renderer'
import type { CarLead } from '@/lib/supabase/types'

const colors = {
  brand: '#1d4ed8',
  brandLight: '#eff6ff',
  text: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  white: '#ffffff',
  bgLight: '#f9fafb',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: colors.text,
    backgroundColor: colors.white,
    padding: 40,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.brand,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBox: {
    width: 28,
    height: 28,
    backgroundColor: colors.brand,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: colors.brand,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerDate: {
    fontSize: 8,
    color: colors.muted,
  },
  headerTitle: {
    fontSize: 8,
    color: colors.muted,
    marginTop: 2,
  },
  // Hero section
  hero: {
    backgroundColor: colors.brandLight,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLeft: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: colors.text,
    marginBottom: 4,
  },
  vehicleSubtitle: {
    fontSize: 9,
    color: colors.muted,
  },
  heroMetrics: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: colors.brand,
  },
  metricLabel: {
    fontSize: 7,
    color: colors.muted,
    marginTop: 2,
  },
  scoreBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: colors.white,
  },
  scoreLabel: {
    fontSize: 7,
    color: colors.white,
    marginTop: 1,
  },
  // Car image
  carImage: {
    width: '100%',
    height: 160,
    objectFit: 'cover',
    borderRadius: 6,
    marginBottom: 16,
  },
  // Section
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.brand,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  gridItem: {
    width: '50%',
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gridLabel: {
    width: '40%',
    fontSize: 8,
    color: colors.muted,
    fontFamily: 'Helvetica-Bold',
  },
  gridValue: {
    width: '60%',
    fontSize: 8,
    color: colors.text,
  },
  // Equipment
  equipmentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  equipmentTag: {
    backgroundColor: colors.bgLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 7,
    color: colors.text,
  },
  // AI Analysis
  aiBox: {
    backgroundColor: colors.bgLight,
    borderRadius: 6,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand,
    marginBottom: 8,
  },
  aiText: {
    fontSize: 8,
    color: colors.text,
    lineHeight: 1.5,
  },
  recommendation: {
    backgroundColor: colors.brandLight,
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
  },
  recommendationText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.brand,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 7,
    color: colors.muted,
  },
})

function formatEur(n: number | null | undefined) {
  if (n == null) return '—'
  return '€' + n.toLocaleString('de-DE')
}

function formatKm(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toLocaleString('de-DE') + ' km'
}

function scoreColor(score: number | null | undefined) {
  if (score == null) return colors.muted
  if (score >= 85) return colors.success
  if (score >= 70) return colors.warning
  return colors.danger
}

interface Props {
  car: CarLead
}

export function CarLeadReport({ car }: Props) {
  const generatedAt = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const firstImage = Array.isArray(car.image_urls) && car.image_urls.length > 0
    ? car.image_urls[0]
    : null

  return (
    <Document title={`AutoLead AI — ${car.vehicle_title}`} author="AutoLead AI">
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <View style={styles.logoBox}>
              <Text style={{ fontSize: 12, color: colors.white, fontFamily: 'Helvetica-Bold' }}>A</Text>
            </View>
            <Text style={styles.logoText}>AutoLead AI</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerDate}>Generated: {generatedAt}</Text>
            <Text style={styles.headerTitle}>Car Lead Report — Confidential</Text>
          </View>
        </View>

        {/* Car Image */}
        {firstImage && (
          <Image src={firstImage} style={styles.carImage} />
        )}

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <Text style={styles.vehicleTitle}>{car.vehicle_title}</Text>
            <Text style={styles.vehicleSubtitle}>
              {[car.year, car.fuel_type, car.transmission].filter(Boolean).join(' · ')}
            </Text>
            <View style={styles.heroMetrics}>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{formatEur(car.price)}</Text>
                <Text style={styles.metricLabel}>Listed Price</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{formatEur(car.estimated_market_value)}</Text>
                <Text style={styles.metricLabel}>Market Value</Text>
              </View>
              <View style={[styles.metric, { color: colors.success }]}>
                <Text style={[styles.metricValue, { color: colors.success }]}>
                  {car.potential_profit && car.potential_profit > 0
                    ? '+' + formatEur(car.potential_profit)
                    : formatEur(car.potential_profit)}
                </Text>
                <Text style={styles.metricLabel}>Potential Profit</Text>
              </View>
            </View>
          </View>
          <View style={[styles.scoreBadge, { backgroundColor: scoreColor(car.deal_score) }]}>
            <Text style={styles.scoreValue}>{car.deal_score ?? '—'}</Text>
            <Text style={styles.scoreLabel}>Deal Score</Text>
          </View>
        </View>

        {/* Vehicle Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Details</Text>
          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Brand</Text>
              <Text style={styles.gridValue}>{car.brand || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Model</Text>
              <Text style={styles.gridValue}>{car.model || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Year</Text>
              <Text style={styles.gridValue}>{car.year || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Mileage</Text>
              <Text style={styles.gridValue}>{formatKm(car.mileage)}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Fuel Type</Text>
              <Text style={styles.gridValue}>{car.fuel_type || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Transmission</Text>
              <Text style={styles.gridValue}>{car.transmission || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Horsepower</Text>
              <Text style={styles.gridValue}>{car.horsepower ? car.horsepower + ' PS' : '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Risk Score</Text>
              <Text style={[styles.gridValue, { color: scoreColor(car.risk_score ? 100 - car.risk_score : null) }]}>
                {car.risk_score != null ? car.risk_score + '/100' : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Location & Seller */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seller & Location</Text>
          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Seller Name</Text>
              <Text style={styles.gridValue}>{car.seller_name || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Mobile</Text>
              <Text style={styles.gridValue}>{car.seller_mobile || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Email</Text>
              <Text style={styles.gridValue}>{car.seller_email || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Seller Type</Text>
              <Text style={styles.gridValue}>{car.seller_type || 'Private'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>PLZ / City</Text>
              <Text style={styles.gridValue}>{[car.plz, car.city].filter(Boolean).join(', ') || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Date Found</Text>
              <Text style={styles.gridValue}>{car.date_found || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Condition */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Condition</Text>
          <View style={styles.grid2}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Accident Info</Text>
              <Text style={styles.gridValue}>{car.accident_info || 'Not specified'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Prev. Owners</Text>
              <Text style={styles.gridValue}>{car.number_of_owners ?? '—'}</Text>
            </View>
          </View>
          {Array.isArray(car.equipment) && car.equipment.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.gridLabel, { marginBottom: 4 }]}>Equipment</Text>
              <View style={styles.equipmentList}>
                {car.equipment.slice(0, 24).map((item, i) => (
                  <Text key={i} style={styles.equipmentTag}>{item}</Text>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* AI Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Market Analysis</Text>
          {car.ai_summary && (
            <View style={styles.aiBox}>
              <Text style={styles.aiText}>{car.ai_summary}</Text>
            </View>
          )}
          {car.ai_recommendation && (
            <View style={styles.recommendation}>
              <Text style={styles.recommendationText}>Recommendation: {car.ai_recommendation}</Text>
            </View>
          )}
        </View>

        {/* Listing URL */}
        {car.listing_url && (
          <View style={{ marginBottom: 40 }}>
            <Text style={[styles.gridLabel, { marginBottom: 2 }]}>Listing URL</Text>
            <Link src={car.listing_url} style={{ fontSize: 7, color: colors.brand }}>
              {car.listing_url}
            </Link>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>AutoLead AI · Confidential Internal Report</Text>
          <Text style={styles.footerText}>Generated {generatedAt}</Text>
        </View>

      </Page>
    </Document>
  )
}
