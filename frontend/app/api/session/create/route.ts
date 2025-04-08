import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
};

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  logger.info(`[${requestId}] Processing session create request`);

  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch (error) {
    logger.error(`[${requestId}] Supabase init error: ${error}`);
    return NextResponse.json({ error: 'Database configuration error', details: String(error) }, { status: 500 });
  }

  try {
    // Parse the request body to check for threadId
    const requestBody = await request.json().catch(() => ({}));
    // Use the threadId from the request if available, otherwise leave it null
    // The frontend will handle creating the thread via client.createThread()
    const threadId = requestBody.threadId || null;

    const { data, error } = await supabase
      .from('session_thread')
      .insert([{
        thread_id: threadId, // Can be null initially, will be updated later
        status: 'uploading',
        current_step: 'uploading',
      }])
      .select('session_id')
      .single();

    if (error) {
      logger.error(`[${requestId}] DB insert error: ${error.message}`);
      return NextResponse.json({ error: 'Failed to create session', details: error.message }, { status: 500 });
    }

    logger.info(`[${requestId}] Created session: ${data.session_id}`);
    return NextResponse.json({
      message: 'Session created successfully',
      session_id: data.session_id,
      thread_id: threadId,
    });
  } catch (error) {
    logger.error(`[${requestId}] Request processing error: ${error}`);
    return NextResponse.json({ error: 'Failed to process request', details: String(error) }, { status: 500 });
  }
}