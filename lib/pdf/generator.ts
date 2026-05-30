import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { CarLeadReport } from '@/components/pdf/CarLeadReport'
import type { CarLead } from '@/lib/supabase/types'

export async function generateCarPDF(car: CarLead): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(CarLeadReport, { car }) as any
  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}
