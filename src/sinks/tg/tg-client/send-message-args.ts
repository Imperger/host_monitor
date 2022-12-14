export interface SendMessageArgs {
  chat_id: number | string;
  message_thread_id?: number;
  text: string;
  parse_mode?: 'MarkdownV2' | 'HTML' | 'Markdown';
  entities?: string;
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
  protect_content?: boolean;
  reply_to_message_id?: boolean;
  allow_sending_without_reply?: boolean;
  reply_markup?: string;
}
