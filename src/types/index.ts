export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface GeneratedImage {
  id: string;
  user_id: string;
  prompt: string;
  style: string;
  image_url: string;
  file_path: string;
  created_at: string;
}
