import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/langgraph-server';
import { createClient } from '@supabase/supabase-js';
import { retrievalAssistantStreamConfig } from '@/constants/graphConfigs';

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

    const assistantId = process.env.LANGGRAPH_RETRIEVAL_ASSISTANT_ID;
    if (!assistantId) {
      return NextResponse.json(
        { error: 'Assistant ID not configured' },
        { status: 500 }
      );
    }

    const serverClient = createServerClient();
    const supabase = getSupabaseClient();

    const result = await serverClient.client.runs.get(threadId, assistantId);

    let messageContent = null;
    if (result.status === 'completed') {
      try {
        const threadMessages = await serverClient.client.threads.messages.list(threadId);
        const assistantMessages = threadMessages.data.filter(msg => msg.role === 'assistant');
        if (assistantMessages.length > 0) {
          const latestMessage = assistantMessages[assistantMessages.length - 1];
          messageContent = latestMessage.content
            .filter(content => content.type === 'text')
            .map(content => content.text.value)
            .join('\n');

          const { data: existingMessage } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('role', 'assistant')
            .eq('thread_id', threadId)
            .eq('content', messageContent)
            .single();

          // Removed the saving of chat_messages
        }
      } catch (messageError) {
        console.error('Error fetching messages:', messageError);
      }
    }

    return NextResponse.json({
      status: result.status === 'completed' ? 'complete' : 'processing',
      data: result,
      message: messageContent
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
    const { message, threadId } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!threadId || !isValidUUID(threadId)) {
      return NextResponse.json(
        { error: 'Valid thread ID is required' },
        { status: 400 }
      );
    }

    const assistantId = process.env.LANGGRAPH_RETRIEVAL_ASSISTANT_ID;
    if (!assistantId) {
      return NextResponse.json(
        { error: 'Assistant ID not configured' },
        { status: 500 }
      );
    }

    const serverClient = createServerClient();
    const supabase = getSupabaseClient();

    await supabase
      .from('chat_messages')
      .insert({
        role: 'user',
        content: message,
        is_complete: true,
        thread_id: threadId
      });

    const stream = serverClient.client.runs.stream(
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

    const encoder = new TextEncoder();
    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          let assistantContent = '';
          let isComplete = false;

          for await (const chunk of stream) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
            );

            if (chunk.kind === 'message' && chunk.role === 'assistant') {
              assistantContent = chunk.content
                .filter(c => c.type === 'text')
                .map(c => c.text.value)
                .join('\n');
            }

            if (chunk.kind === 'streamEnd') {
              isComplete = true;
            }
          }

          // Removed the saving of chat_messages
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: 'Streaming error occurred' })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
