const API_BASE_URL = 'http://127.0.0.1:8000/api';

export interface CommentAnalysis {
  text: string;
  processed_text: string;
  emotion_model: string;
  emotions: string[];
  sarcasm_label: number;
  sarcasm_probability: number;
}

export interface YouTubeAnalyzeResponse {
  video_id: string;
  total_comments: number;
  analyzed_comments: number;
  emotion_distribution: Record<string, number>;
  sarcasm_rate: number;
  model_usage: Record<string, number>;
  comments: CommentAnalysis[];
}

export const api = {
  async analyzeYouTubeVideo(url: string): Promise<YouTubeAnalyzeResponse> {
    const response = await fetch(`${API_BASE_URL}/analyze/youtube`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to analyze video');
    }

    return response.json();
  }
};
