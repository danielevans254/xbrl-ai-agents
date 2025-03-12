import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/langgraph-server';
import { retrievalAssistantStreamConfig } from '@/constants/graphConfigs';

export const runtime = 'edge';

const activeThreads = new Map();

export async function POST(req: Request) {
  try {
    const { message, threadId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
    }

    if (!process.env.LANGGRAPH_RETRIEVAL_ASSISTANT_ID) {
      return NextResponse.json(
        { error: 'LANGGRAPH_RETRIEVAL_ASSISTANT_ID is not set' },
        { status: 500 }
      );
    }

    // Check if this thread has an active task
    const isThreadActive = activeThreads.get(threadId);
    if (isThreadActive) {
      return NextResponse.json(
        { error: 'Thread is currently processing another request' },
        { status: 429 }
      );
    }

    try {
      // Mark this thread as active
      activeThreads.set(threadId, true);

      const assistantId = process.env.LANGGRAPH_RETRIEVAL_ASSISTANT_ID;
      const serverClient = createServerClient();

      const stream = await serverClient.client.runs.stream(
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

      // Set up response as a stream
      const encoder = new TextEncoder();
      const customReadable = new ReadableStream({
        async start(controller) {
          try {
            // First, send a keep-alive message to initialize the stream
            controller.enqueue(encoder.encode('data: {"type":"keep-alive"}\n\n'));

            // Forward each chunk from the graph to the client
            for await (const chunk of stream) {
              // Make sure the chunk is valid JSON
              try {
                // Safely stringify the chunk
                const jsonChunk = JSON.stringify(chunk);
                controller.enqueue(encoder.encode(`data: ${jsonChunk}\n\n`));

                // Periodically send keep-alive messages to maintain the connection
                if (chunk.type === 'message') {
                  controller.enqueue(encoder.encode('data: {"type":"keep-alive"}\n\n'));
                }
              } catch (jsonError) {
                console.error('Error stringifying chunk:', jsonError);
                controller.enqueue(
                  encoder.encode(`data: {"error":"Error processing message"}\n\n`)
                );
              }
            }

            // Send an end message to signal completion
            controller.enqueue(encoder.encode('data: {"type":"end"}\n\n'));
          } catch (error) {
            console.error('Streaming error:', error);
            // Send the error as a proper JSON response
            controller.enqueue(
              encoder.encode(`data: {"error":"${String(error).replace(/"/g, '\\"')}"}\n\n`)
            );
          } finally {
            // Release the thread when done
            activeThreads.delete(threadId);
            controller.close();
          }
        },
        cancel() {
          console.log('Stream was cancelled by the client');
          // Ensure we clean up if the client disconnects
          activeThreads.delete(threadId);
        }
      });

      // Return the stream with appropriate headers
      return new Response(customReadable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no', // Disable buffering in Nginx
        },
      });
    } catch (error) {
      // Always clean up the thread state on error
      activeThreads.delete(threadId);

      // Special handling for 422 errors (thread busy)
      if (error.status === 422) {
        return NextResponse.json(
          { error: 'Thread is already processing a task' },
          { status: 429 }
        );
      }

      // Handle other streamRun errors
      console.error('Stream initialization error:', error);
      return NextResponse.json(
        { error: String(error) },
        { status: 500 }
      );
    }
  } catch (error) {
    // Handle JSON parsing errors
    console.error('Route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}