import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const VALID_STATUSES = [
  'uploading', 'upload_complete', 'upload_failed',
  'extracting', 'extracting_complete', 'extracting_failed',
  'mapping', 'mapping_complete', 'mapping_failed',
  'validating', 'validation_complete', 'validation_failed',
  'tagging', 'tagging_complete', 'tagging_failed',
  'generating', 'generation_complete', 'generation_failed'
];

const VALID_STEPS = [
  'uploading', 'extracting', 'mapping', 'validating', 'tagging', 'generating'
];

// Helper function to derive the current step from a status
const deriveCurrentStep = (status: string): string | null => {
  // Direct mapping for statuses that match allowed steps
  if (VALID_STEPS.includes(status)) {
    return status;
  }

  // For compound statuses (e.g., 'upload_complete'), extract the base step
  const baseStep = status.split('_')[0];

  // Map the base step to the correct current_step value
  switch (baseStep) {
    case 'upload':
      return 'uploading';
    case 'extracting':
      return 'extracting';
    case 'mapping':
      return 'mapping';
    case 'validation':
      return 'validating';
    case 'tagging':
      return 'tagging';
    case 'generation':
      return 'generating';
    default:
      return null;
  }
};

/**
 * Creates and returns a Supabase client with error handling
 */
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  try {
    return createClient(supabaseUrl, supabaseServiceKey);
  } catch (error) {
    throw new Error(`Failed to create Supabase client: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  logger.info(`[${requestId}] Processing session update request`);

  try {
    // Parse request body
    const body = await request.json();
    const { sessionId, status, currentStep } = body;

    // Validate required parameters
    if (!sessionId || !status) {
      logger.warn(`[${requestId}] Missing required parameters: sessionId=${sessionId}, status=${status}`);
      return NextResponse.json({ error: 'Missing sessionId or status' }, { status: 400 });
    }

    // Validate status is in the allowed list
    if (!VALID_STATUSES.includes(status)) {
      logger.warn(`[${requestId}] Invalid status value: ${status}`);
      return NextResponse.json({
        error: 'Invalid status value',
        validValues: VALID_STATUSES
      }, { status: 400 });
    }

    // Initialize Supabase client
    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (error) {
      logger.error(`[${requestId}] Failed to initialize Supabase client:`, error);
      return NextResponse.json({
        error: 'Database configuration error',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }

    // Determine the current_step value
    let step = currentStep;
    if (!step || !VALID_STEPS.includes(step)) {
      step = deriveCurrentStep(status);
      logger.info(`[${requestId}] Derived current_step '${step}' from status '${status}'`);
    }

    // Prepare update data with both status and current_step
    const updateData: any = {
      status,
      current_step: step
    };

    // Update session
    const { error } = await supabase
      .from('session_thread')
      .update(updateData)
      .eq('session_id', sessionId);

    if (error) {
      logger.error(`[${requestId}] Database update error:`, error);
      return NextResponse.json({
        error: 'Failed to update session status',
        details: error.message
      }, { status: 500 });
    }

    logger.info(`[${requestId}] Successfully updated session: ${sessionId} with status: ${status}, current_step: ${step}`);
    return NextResponse.json({
      message: 'Session status updated successfully',
      sessionId,
      status,
      current_step: step
    });
  } catch (error) {
    logger.error(`[${requestId}] Unhandled error:`, error);
    return NextResponse.json({
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}