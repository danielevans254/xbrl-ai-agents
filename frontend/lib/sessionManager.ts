export class SessionManager {
  static saveSession(threadId: string, data: any) {
    const sessionData = {
      threadId,
      data,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('sessionData', JSON.stringify(sessionData));
  }

  static loadSession() {
    const sessionData = localStorage.getItem('sessionData');
    return sessionData ? JSON.parse(sessionData) : null;
  }

  static clearSession() {
    localStorage.removeItem('sessionData');
  }
}

export class PollingManager {
  static async pollThreadStatus(threadId: string, interval: number, callback: (status: string, data: any) => void) {
    const poll = async () => {
      try {
        const response = await fetch(`/api/chat?threadId=${threadId}`);
        const result = await response.json();
        callback(result.status, result.data);
        if (result.status !== 'complete') {
          setTimeout(poll, interval);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };
    poll();
  }
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
}
