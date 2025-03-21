interface SessionResponse {
  success: boolean;
  data?: {
    status: 'processing' | 'complete';
    progress: number;
    sessionId?: string;
    currentStep?: string;
    sessionData?: any;
    elapsedTime?: number;
    created_at?: string;
  };
  error?: string;
  details?: string;
  meta: {
    requestId: string;
  };
}

export interface ExtractedDataResponse {
  success: boolean;
  data?: any[];
  error?: string;
  details?: string;
  meta?: {
    count: number;
    requestId: string;
  };
}

export class SessionManager {
  private static SESSION_STORAGE_KEY = 'data_extraction_session';

  static saveSession(threadId: string, data: any): void {
    const sessionData = {
      threadId,
      timestamp: new Date().toISOString(),
      ...data
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    }
  }

  static loadSession(): any {
    if (typeof window !== 'undefined') {
      const storedData = localStorage.getItem(this.SESSION_STORAGE_KEY);
      return storedData ? JSON.parse(storedData) : null;
    }
    return null;
  }

  static clearSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.SESSION_STORAGE_KEY);
    }
  }

  static async getSessionStatus(threadId: string): Promise<SessionResponse> {
    try {
      const response = await fetch(`/api/session-status?threadId=${threadId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Failed to fetch session status',
          meta: {
            requestId: errorData.meta?.requestId || 'unknown'
          }
        };
      }

      return await response.json() as SessionResponse;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        meta: {
          requestId: 'error'
        }
      };
    }
  }
}

export class ExtractedDataManager {
  static async getExtractedData(threadId: string): Promise<ExtractedDataResponse> {
    try {
      const response = await fetch(`/api/extract?threadId=${threadId}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching extracted data:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch extracted data');
    }
  }

  static async saveExtractedData(threadId: string, data: any): Promise<ExtractedDataResponse> {
    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadId,
          data,
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Error saving extracted data:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to save extracted data');
    }
  }
}