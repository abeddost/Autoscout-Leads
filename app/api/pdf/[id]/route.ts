import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateCarPDF } from '@/lib/pdf/generator'
import type { CarLead } from '@/lib/supabase/types'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: carRow, error } = await supabase
    .from('car_leads')
    .select('*')
    .eq('id', id)
    .single()

  const car = carRow as CarLead | null
  if (error || !car) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  try {
    const pdfBuffer = await generateCarPDF(car)
    const fileName = `${car.brand}-${car.model}-${car.id}.pdf`
      .toLowerCase()
      .replace(/\s+/g, '-')

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('car-reports')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('car-reports')
        .getPublicUrl(fileName)

      if (urlData?.publicUrl) {
        await supabase
          .from('car_leads')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update({ pdf_url: urlData.publicUrl } as any)
          .eq('id', id)
      }
    }

    return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
