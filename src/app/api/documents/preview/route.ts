import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { renderPdfToImage } from '@/lib/server/pdf/renderPdfToImage';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get('id');

  if (!docId) {
    return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // 1. Get document info
    const { data: doc, error: docError } = await supabase
      .from('travel_documents')
      .select('file_url, title')
      .eq('id', docId)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // 2. Extract bucket and path from file_url
    // Expected format: https://.../storage/v1/object/public/travel-documents/plan_id/file.pdf
    // Or: https://.../storage/v1/object/authenticated/travel-documents/plan_id/file.pdf
    const url = new URL(doc.file_url);
    const pathParts = url.pathname.split('/storage/v1/object/')[1].split('/');
    const isPublic = pathParts[0] === 'public';
    const bucket = isPublic ? pathParts[1] : pathParts[1]; // Parts[0] was 'public' or 'authenticated'
    const filePath = pathParts.slice(2).join('/');

    // 3. Download the file from Supabase Storage
    const { data, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (downloadError || !data) {
      console.error('[API Preview] Download error:', downloadError);
      return NextResponse.json({ error: 'Failed to download document' }, { status: 500 });
    }

    // 4. Handle based on file type
    const pdfBuffer = Buffer.from(await data.arrayBuffer());
    const contentType = data.type || 'application/pdf';

    if (contentType === 'application/pdf' || (doc.file_url && doc.file_url.toLowerCase().endsWith('.pdf'))) {
      const imageBuffer = await renderPdfToImage(pdfBuffer);
      return new NextResponse(imageBuffer as any, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // If it's already an image, return it as is
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err: any) {
    console.error('[API Preview] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
