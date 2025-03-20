// Create a new file: /app/api/chat/saveExtractedData/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL or service key is not set');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};

function isValidUUID(uuid: string | null): boolean {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const threadId = url.searchParams.get('threadId');

    if (!threadId || !isValidUUID(threadId)) {
      return NextResponse.json(
        { error: 'Valid thread ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('extracted_data')
      .select('*')
      .eq('thread_id', threadId);

    if (error) {
      console.error('Error fetching extracted data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch extracted data', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { threadId, data } = await req.json();

    if (!threadId || !isValidUUID(threadId)) {
      return NextResponse.json(
        { error: 'Valid thread ID is required' },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Data is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const { error: insertError } = await supabase
      .from('extracted_data')
      .insert({
        thread_id: threadId,
        data: data
      });

    if (insertError) {
      console.error('Error saving extracted data:', insertError);
      return NextResponse.json(
        { error: 'Failed to save extracted data', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Extracted data saved successfully'
    });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
