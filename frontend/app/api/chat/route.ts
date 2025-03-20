import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/langgraph-server';
import { createClient } from '@supabase/supabase-js';
import { retrievalAssistantStreamConfig } from '@/constants/graphConfigs';

export const runtime = 'edge';

// Constants for error messages and timeouts
const ERROR_MESSAGES = {
  MISSING_SUPABASE_CONFIG: 'Supabase configuration is incomplete',
  INVALID_THREAD_ID: 'Valid thread ID is required',
  MISSING_MESSAGE: 'Message content is required',
  MISSING_ASSISTANT_ID: 'Assistant ID not configured',
  SERVER_ERROR: 'Internal server error',
  FETCH_MESSAGES_ERROR: 'Error fetching messages',
  STREAM_ERROR: 'Streaming error occurred',
  SUPABASE_INSERT_ERROR: 'Error inserting message into database',
  REQUEST_TIMEOUT: 'Request timed out'
};

const TIMEOUT_MS = 30000; // 30 seconds timeout

/**
 * Creates and returns a Supabase client with error handling
 */
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[API] Supabase configuration missing');
    throw new Error(ERROR_MESSAGES.MISSING_SUPABASE_CONFIG);
  }

  try {
    return createClient(supabaseUrl, supabaseServiceKey);
  } catch (error) {
    console.error('[API] Failed to create Supabase client:', error);
    throw new Error(`${ERROR_MESSAGES.MISSING_SUPABASE_CONFIG}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Validates if a string is a valid UUID
 */
function isValidUUID(uuid: string | null): boolean {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validates the assistant ID from environment variables
 */
function getAssistantId(): string {
  const assistantId = process.env.LANGGRAPH_RETRIEVAL_ASSISTANT_ID;
  if (!assistantId) {
    console.error('[API] Assistant ID not configured in environment variables');
    throw new Error(ERROR_MESSAGES.MISSING_ASSISTANT_ID);
  }
  return assistantId;
}

/**
 * Extracts message content from assistant response
 */
function extractMessageContent(message: any): string {
  if (!message || !message.content || !Array.isArray(message.content)) {
    return '';
  }

  return message.content
    .filter((content: any) => content.type === 'text' && content.text && content.text.value)
    .map((content: any) => content.text.value)
    .join('\n');
}

/**
 * Handles request with timeout
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(ERROR_MESSAGES.REQUEST_TIMEOUT));
    }, timeoutMs);
  });

  return Promise.race([
    promise,
    timeoutPromise
  ]).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * GET endpoint to check status of a thread
 */
export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  console.log(`[API][${requestId}] GET request received`);

  try {
    const url = new URL(req.url);
    const threadId = url.searchParams.get('threadId');

    console.log(`[API][${requestId}] Checking thread status for threadId: ${threadId}`);

    // Validate thread ID
    if (!threadId || !isValidUUID(threadId)) {
      console.error(`[API][${requestId}] Invalid thread ID: ${threadId}`);
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_THREAD_ID },
        { status: 400 }
      );
    }

    // Get and validate assistant ID
    let assistantId: string;
    try {
      assistantId = getAssistantId();
    } catch (error) {
      console.error(`[API][${requestId}] ${error instanceof Error ? error.message : String(error)}`);
      return NextResponse.json(
        { error: ERROR_MESSAGES.MISSING_ASSISTANT_ID },
        { status: 500 }
      );
    }

    // Initialize clients
    let serverClient;
    let supabase;

    try {
      serverClient = createServerClient();
      supabase = getSupabaseClient();
    } catch (error) {
      console.error(`[API][${requestId}] Failed to initialize clients:`, error);
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR, details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }

    // Get run status with timeout
    const result = await withTimeout(
      serverClient.client.runs.get(threadId, assistantId),
      TIMEOUT_MS
    ).catch(error => {
      console.error(`[API][${requestId}] Error fetching run status:`, error);
      throw error;
    });

    console.log(`[API][${requestId}] Run status: ${result.status}`);

    // Get message content if run is completed
    let messageContent = null;
    if (result.status === 'completed') {
      try {
        console.log(`[API][${requestId}] Fetching thread messages`);
        const threadMessages = await serverClient.client.threads.messages.list(threadId);

        if (!threadMessages || !threadMessages.data) {
          console.warn(`[API][${requestId}] No messages found in thread`);
        } else {
          const assistantMessages = threadMessages.data.filter(msg => msg.role === 'assistant');
          console.log(`[API][${requestId}] Found ${assistantMessages.length} assistant messages`);

          if (assistantMessages.length > 0) {
            const latestMessage = assistantMessages[assistantMessages.length - 1];
            messageContent = extractMessageContent(latestMessage);

            console.log(`[API][${requestId}] Latest message extracted (${messageContent.length} chars)`);

            // Check if message already exists in database
            try {
              const { data: existingMessage } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('role', 'assistant')
                .eq('thread_id', threadId)
                .eq('content', messageContent)
                .single();

              console.log(`[API][${requestId}] Message existence check: ${existingMessage ? 'exists' : 'does not exist'}`);
            } catch (dbError) {
              console.warn(`[API][${requestId}] Database check failed:`, dbError);
              // Continue processing even if database check fails
            }
          }
        }
      } catch (messageError) {
        console.error(`[API][${requestId}] Error fetching messages:`, messageError);
        // Don't throw here, just log the error and continue with partial data
      }
    }

    console.log(`[API][${requestId}] GET request completed successfully`);
    return NextResponse.json({
      status: result.status === 'completed' ? 'complete' : 'processing',
      data: result,
      message: messageContent,
      requestId
    });
  } catch (error) {
    console.error(`[API][${requestId}] GET error:`, error);

    // Determine appropriate status code
    let statusCode = 500;
    if (error instanceof Error && error.message === ERROR_MESSAGES.REQUEST_TIMEOUT) {
      statusCode = 504; // Gateway timeout
    }

    return NextResponse.json(
      {
        error: ERROR_MESSAGES.SERVER_ERROR,
        details: error instanceof Error ? error.message : String(error),
        requestId
      },
      { status: statusCode }
    );
  }
}

/**
 * POST endpoint to send a message to a thread
 */
export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  console.log(`[API][${requestId}] POST request received`);

  try {
    // Parse request body with error handling
    let message, threadId;
    try {
      const body = await req.json();
      message = body.message;
      threadId = body.threadId;

      console.log(`[API][${requestId}] Message received for threadId: ${threadId}`);
    } catch (parseError) {
      console.error(`[API][${requestId}] Failed to parse request body:`, parseError);
      return NextResponse.json(
        { error: 'Invalid request format', requestId },
        { status: 400 }
      );
    }

    // Validate inputs
    if (!message || typeof message !== 'string' || message.trim() === '') {
      console.error(`[API][${requestId}] Missing or invalid message`);
      return NextResponse.json(
        { error: ERROR_MESSAGES.MISSING_MESSAGE, requestId },
        { status: 400 }
      );
    }

    if (!threadId || !isValidUUID(threadId)) {
      console.error(`[API][${requestId}] Invalid thread ID: ${threadId}`);
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_THREAD_ID, requestId },
        { status: 400 }
      );
    }

    // Get and validate assistant ID
    let assistantId: string;
    try {
      assistantId = getAssistantId();
    } catch (error) {
      console.error(`[API][${requestId}] ${error instanceof Error ? error.message : String(error)}`);
      return NextResponse.json(
        { error: ERROR_MESSAGES.MISSING_ASSISTANT_ID, requestId },
        { status: 500 }
      );
    }

    // Initialize clients
    let serverClient;
    let supabase;

    try {
      serverClient = createServerClient();
      supabase = getSupabaseClient();
    } catch (error) {
      console.error(`[API][${requestId}] Failed to initialize clients:`, error);
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR, details: error instanceof Error ? error.message : String(error), requestId },
        { status: 500 }
      );
    }

    // Save user message to database
    try {
      const { error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          role: 'user',
          content: message,
          is_complete: true,
          thread_id: threadId,
          metadata: { requestId }
        });

      if (insertError) {
        console.error(`[API][${requestId}] Error inserting message:`, insertError);
        // Log but don't fail the request
      } else {
        console.log(`[API][${requestId}] User message saved to database`);
      }
    } catch (dbError) {
      console.error(`[API][${requestId}] Database error:`, dbError);
      // Log but don't fail the request
    }

    // Stream the response with error handling
    console.log(`[API][${requestId}] Starting stream`);
    let stream;
    try {
      stream = serverClient.client.runs.stream(
        threadId,
        assistantId,
        {
          input: { query: message },
          streamMode: ['messages', 'updates'],
          config: {
            configurable: {
              ...retrievalAssistantStreamConfig,
            },
          },
        }
      );
    } catch (streamError) {
      console.error(`[API][${requestId}] Error creating stream:`, streamError);
      return NextResponse.json(
        { error: ERROR_MESSAGES.STREAM_ERROR, details: streamError instanceof Error ? streamError.message : String(streamError), requestId },
        { status: 500 }
      );
    }

    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          console.log(`[API][${requestId}] Stream started`);
          let assistantContent = '';
          let isComplete = false;
          let chunkCount = 0;

          for await (const chunk of stream) {
            chunkCount++;

            // Every 10 chunks, log progress
            if (chunkCount % 10 === 0) {
              console.log(`[API][${requestId}] Stream progress: ${chunkCount} chunks processed`);
            }

            // Send chunk to client
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ ...chunk, requestId })}\n\n`)
            );

            // Extract content from assistant messages
            if (chunk.kind === 'message' && chunk.role === 'assistant') {
              assistantContent = extractMessageContent(chunk);
            }

            // Check for stream completion
            if (chunk.kind === 'streamEnd') {
              isComplete = true;
              console.log(`[API][${requestId}] Stream completed successfully after ${chunkCount} chunks`);
            }
          }

          // Send final status message
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              kind: 'status',
              status: 'complete',
              requestId,
              totalChunks: chunkCount
            })}\n\n`)
          );

        } catch (error) {
          console.error(`[API][${requestId}] Streaming error:`, error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: ERROR_MESSAGES.STREAM_ERROR,
                details: error instanceof Error ? error.message : String(error),
                requestId
              })}\n\n`
            )
          );
        } finally {
          console.log(`[API][${requestId}] Stream closing`);
          controller.close();
        }
      },
    });

    console.log(`[API][${requestId}] Returning stream response`);
    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Request-ID': requestId
      }
    });
  } catch (error) {
    console.error(`[API][${requestId}] POST error:`, error);

    // Determine appropriate status code
    let statusCode = 500;
    if (error instanceof Error && error.message === ERROR_MESSAGES.REQUEST_TIMEOUT) {
      statusCode = 504; // Gateway timeout
    }

    return NextResponse.json(
      {
        error: ERROR_MESSAGES.SERVER_ERROR,
        details: error instanceof Error ? error.message : String(error),
        requestId
      },
      { status: statusCode }
    );
  }
}