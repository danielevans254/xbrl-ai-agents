import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/langgraph-server';
import { retrievalAssistantStreamConfig } from '@/constants/graphConfigs';

export const runtime = 'edge';

// FIXME: Persist completed data to supabase
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const threadId = url.searchParams.get('threadId');
    const event = url.searchParams.get('event');

    if (!threadId || !isValidUUID(threadId)) {
      return new NextResponse(
        JSON.stringify({ error: 'Valid Thread ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const serverClient = createServerClient();
    const assistantId = process.env.LANGGRAPH_RETRIEVAL_ASSISTANT_ID;
    if (!assistantId) {
      return new NextResponse(
        JSON.stringify({ error: 'LANGGRAPH_RETRIEVAL_ASSISTANT_ID is not set' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Pass an object with run_id and assistant_id as expected by the API
    const result = await serverClient.client.runs.get({
      run_id: threadId,
      assistant_id: assistantId,
    });

    if (event === 'messages/complete') {
      return new NextResponse(
        JSON.stringify({ data: result }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    } else {
      return new NextResponse(
        JSON.stringify({ status: 'processing', data: result }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  } catch (error) {
    console.error('GET request error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

function isValidUUID(uuid: string | null): boolean {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function POST(req: Request) {
  try {
    const { message, threadId } = await req.json();

    if (!message) {
      return new NextResponse(
        JSON.stringify({ error: 'Message is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    if (!threadId) {
      return new NextResponse(
        JSON.stringify({ error: 'Thread ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    if (!process.env.LANGGRAPH_RETRIEVAL_ASSISTANT_ID) {
      return new NextResponse(
        JSON.stringify({
          error: 'LANGGRAPH_RETRIEVAL_ASSISTANT_ID is not set',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    try {
      const assistantId = process.env.LANGGRAPH_RETRIEVAL_ASSISTANT_ID;
      const serverClient = createServerClient();

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
        },
      );

      const encoder = new TextEncoder();
      const customReadable = new ReadableStream({
        async start(controller) {
          try {
            // Forward ALL chunks from the graph to the client
            for await (const chunk of stream) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`),
              );
            }
          } catch (error) {
            console.error('Streaming error:', error);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: 'Streaming error occurred' })}\n\n`,
              ),
            );
          } finally {
            controller.close();
          }
        },
      });

      // Return the stream with appropriate headers
      return new Response(customReadable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } catch (error) {
      // Handle streamRun errors
      console.error('Stream initialization error:', error);
      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  } catch (error) {
    // Handle JSON parsing errors
    console.error('Route error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
