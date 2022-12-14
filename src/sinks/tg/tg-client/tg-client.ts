import axios from 'axios';
import type { User } from './user';
import type { SendMessageArgs } from './send-message-args';
import type { Message } from './message';

interface MethodArgs {
  [method: string]: string;
}

interface Response<T> {
  ok: boolean;
  result: T;
}

export class TgClient {
  private me!: User;

  private constructor(
    private readonly token: string,
    private readonly apiEntry = 'https://api.telegram.org'
  ) {}

  public static async Create(token: string): Promise<TgClient | null> {
    const instance = new TgClient(token);

    try {
      instance.me = await instance.GetMe();
      return instance;
    } catch (e) {
      return null;
    }
  }

  public async GetMe(): Promise<User> {
    return (await axios.post<Response<User>>(this.ConstructRequest('getMe'))).data.result;
  }

  public async SendMessage(channelId: number, text: string): Promise<Message> {
    const args: SendMessageArgs = { chat_id: channelId, text };
    return (await axios.post<Response<Message>>(this.ConstructRequest('sendMessage'), args)).data
      .result;
  }

  public get Me(): User {
    return this.me;
  }

  private ConstructRequest(method: string, args?: MethodArgs): string {
    const queryParamsPart = args ? `?${new URLSearchParams(args)}` : '';
    return `${this.apiEntry}/bot${this.token}/${method}${queryParamsPart}`;
  }
}
