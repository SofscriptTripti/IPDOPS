import { HubConnection, HubConnectionBuilder, LogLevel, HubConnectionState, HttpTransportType } from '@microsoft/signalr';
import { API_CONFIG } from '../config/api';

// Patch React Native URL polyfill for SignalR URL resolver compatibility (which tries to mutate pathname)
const g = globalThis as any;
if (g.URL && !g.URL.__isWritablePatch) {
  const OriginalURL = g.URL;
  console.log('[SignalR] Installing globalThis.URL pathname patch...');
  class WritableURL {
    static __isWritablePatch = true;
    private _url: any;
    private _pathname: string | null = null;

    constructor(url: string | WritableURL, base?: string | WritableURL) {
      const urlStr = url instanceof WritableURL ? url.href : String(url);
      const baseStr = base instanceof WritableURL ? base.href : base ? String(base) : undefined;
      this._url = new OriginalURL(urlStr, baseStr);
    }

    get href() {
      if (this._pathname !== null) {
        const origin = this._url.origin || '';
        const search = this._url.search || '';
        const hash = this._url.hash || '';
        return `${origin}${this._pathname}${search}${hash}`;
      }
      return this._url.href;
    }

    set href(val: string) {
      this._url = new OriginalURL(val);
      this._pathname = null;
    }

    get pathname() {
      return this._pathname !== null ? this._pathname : this._url.pathname;
    }

    set pathname(val: string) {
      this._pathname = val;
    }

    get search() { return this._url.search; }
    set search(val) { this._url.search = val; }
    get hash() { return this._url.hash; }
    set hash(val) { this._url.hash = val; }
    get host() { return this._url.host; }
    get hostname() { return this._url.hostname; }
    get port() { return this._url.port; }
    get protocol() { return this._url.protocol; }
    get origin() { return this._url.origin; }

    toString() {
      return this.href;
    }
  }

  try {
    Object.defineProperty(g, 'URL', {
      value: WritableURL,
      writable: true,
      configurable: true,
      enumerable: true
    });
    console.log('[SignalR] Redefined globalThis.URL successfully with writable patch.');
  } catch (err) {
    console.warn('[SignalR] Failed to redefine global URL descriptor, trying fallback assignment:', err);
    try {
      g.URL = WritableURL;
    } catch (e) {
      console.error('[SignalR] Critical: URL patch could not be applied:', e);
    }
  }
}

class SignalRService {
  private connection: HubConnection | null = null;
  private onMessageReceivedCallbacks: ((message: any) => void)[] = [];
  private onUnreadCountCallbacks: ((data: any) => void)[] = [];
  private onRefreshCallbacks: (() => void)[] = [];

  get isConnected(): boolean {
    return this.connection !== null && this.connection.state === HubConnectionState.Connected;
  }

  /**
   * Establishes a Microsoft SignalR connection to the chatHub endpoint.
   */
  async startConnection(token: string, userId: string): Promise<HubConnection | null> {
    if (this.connection) {
      if (this.connection.state === HubConnectionState.Connected) {
        console.log('[SignalR] Connection already exists and is connected.');
        return this.connection;
      }
      if (this.connection.state === HubConnectionState.Connecting || this.connection.state === HubConnectionState.Reconnecting) {
        console.log('[SignalR] Connection is currently connecting or reconnecting.');
        return this.connection;
      }
      // If it is disconnected, try restarting it
      try {
        console.log('[SignalR] Re-starting existing disconnected connection...');
        await this.connection.start();
        return this.connection;
      } catch (err) {
        console.warn('[SignalR] Failed to start existing connection, rebuilding...', err);
        this.connection = null;
      }
    }
    const hubUrl = `${API_CONFIG.CAREWORKS_BASE_URL.replace(/\/api\/?$/, '')}/hubs/chat`;

    console.log('====================================');
    console.log('[SignalR] STARTING CONNECTION HIT:');
    console.log('Hub URL:', hubUrl);
    console.log('Token:', token ? `${token.substring(0, 15)}...` : 'NONE');
    console.log('User ID:', userId);
    console.log('====================================');

    try {
      this.connection = new HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => token,
          skipNegotiation: false,
        })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Information)
        .build();

      // Listen for chat message payloads (generic mapping support)
      const listenMethods = [
        'ReceiveMessage',
        'receiveMessage',
        'ReceiveChat',
        'receiveChat',
        'MessageReceived',
        'messageReceived',
        'onMessageReceived',
        'ReceiveOTBooking',
        'receiveOTBooking',
        'OTBookingReceived',
        'otBookingReceived'
      ];

      for (const method of listenMethods) {
        this.connection.on(method, (data: any) => {
          console.log('====================================');
          console.log(`[SignalR] EVENT RECEIVED [${method}]:`);
          console.log('DATA:', JSON.stringify(data, null, 2));
          console.log('====================================');

          this.onMessageReceivedCallbacks.forEach(cb => {
            try { cb(data); } catch (e) { console.warn(e); }
          });
        });
      }

      // Listen for unread status counts (generic mapping support)
      const unreadCountMethods = [
        'UnreadCountUpdated',
        'unreadCountUpdated',
        'UnreadCount',
        'unreadCount',
        'UpdateUnreadCount'
      ];

      for (const method of unreadCountMethods) {
        this.connection.on(method, (data: any) => {
          console.log('====================================');
          console.log(`[SignalR] UNREAD COUNT EVENT RECEIVED [${method}]:`);
          console.log('DATA:', JSON.stringify(data, null, 2));
          console.log('====================================');

          this.onUnreadCountCallbacks.forEach(cb => {
            try { cb(data); } catch (e) { console.warn(e); }
          });
        });
      }

      // Listen for generic refresh triggers (casing-safe)
      const refreshMethods = [
        'RefreshChat', 'refreshChat', 'RefreshMessages', 'refreshMessages',
        'message', 'Message', 'chat', 'Chat', 'Refresh', 'refresh', 'UpdateChat', 'updateChat',
        'MessageEdited', 'messageEdited', 'MessageUpdated', 'messageUpdated',
        'MessageDeleted', 'messageDeleted', 'ChatMessageEdited', 'chatMessageEdited',
        'ChatMessageDeleted', 'chatMessageDeleted', 'ThreadUpdated', 'threadUpdated',
        'RefreshOT', 'refreshOT', 'OTRefresh', 'otRefresh', 'OTBookingAdded', 'otBookingAdded',
        'OTBookingUpdated', 'otBookingUpdated', 'RefreshBooking', 'refreshBooking',
        'OTRegisterUpdated', 'otRegisterUpdated', 'RefreshOTDashboard', 'refreshOTDashboard'
      ];
      // NOTE: intentionally NOT listening for MessageSeen/MessageRead/etc. here.
      // The backend broadcasts those right after this client's own chatMarkRead call;
      // reacting to them by re-fetching (which itself calls chatMarkRead) creates an
      // infinite read -> broadcast -> refetch -> read loop. The 5s poll in
      // PatientTimelineScreen already keeps isSeen ticks in sync without this risk.

      for (const method of refreshMethods) {
        this.connection.on(method, () => {
          console.log('====================================');
          console.log(`[SignalR] REFRESH SIGNAL EVENT RECEIVED [${method}]`);
          console.log('====================================');

          this.onRefreshCallbacks.forEach(cb => {
            try { cb(); } catch (e) { console.warn(e); }
          });
        });
      }

      this.connection.onreconnecting((error) => {
        console.log('[SignalR] Connection reconnecting...', error);
      });

      this.connection.onreconnected((connectionId) => {
        console.log('[SignalR] Connection reconnected. ID:', connectionId);
      });

      this.connection.onclose((error) => {
        console.log('[SignalR] Connection closed.', error);
      });

      await this.connection.start();
      console.log('====================================');
      console.log('[SignalR] CONNECTION ESTABLISHED SUCCESSFULLY');
      console.log('====================================');
      return this.connection;
    } catch (err: any) {
      console.log('====================================');
      console.log('[SignalR] CONNECTION EXCEPTION:', err);
      console.log('====================================');
      this.connection = null;
      throw err;
    }
  }

  /**
   * Closes active Microsoft SignalR hub connections.
   */
  async stopConnection(): Promise<void> {
    if (!this.connection) return;
    try {
      await this.connection.stop();
      console.log('[SignalR] Connection stopped.');
    } catch (err) {
      console.warn('[SignalR] Stop connection error:', err);
    } finally {
      this.connection = null;
    }
  }

  subscribeToReceiveMessage(callback: (message: any) => void): void {
    this.onMessageReceivedCallbacks.push(callback);
  }

  unsubscribeFromReceiveMessage(callback: (message: any) => void): void {
    this.onMessageReceivedCallbacks = this.onMessageReceivedCallbacks.filter(cb => cb !== callback);
  }

  subscribeToUnreadCount(callback: (data: any) => void): void {
    this.onUnreadCountCallbacks.push(callback);
  }

  unsubscribeFromUnreadCount(callback: (data: any) => void): void {
    this.onUnreadCountCallbacks = this.onUnreadCountCallbacks.filter(cb => cb !== callback);
  }

  subscribeToRefresh(callback: () => void): void {
    this.onRefreshCallbacks.push(callback);
  }

  unsubscribeFromRefresh(callback: () => void): void {
    this.onRefreshCallbacks = this.onRefreshCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Invokes standard backend hub server callbacks.
   */
  async invokeHubMethod(methodName: string, ...args: any[]): Promise<any> {
    if (!this.connection) {
      console.warn('[SignalR] No active connection to invoke:', methodName);
      return null;
    }
    console.log('====================================');
    console.log('[SignalR] INVOKING METHOD HIT:');
    console.log('METHOD:', methodName);
    console.log('ARGS:', JSON.stringify(args, null, 2));
    console.log('====================================');

    try {
      const res = await this.connection.invoke(methodName, ...args);
      console.log('====================================');
      console.log('[SignalR] INVOKE RESPONSE:');
      console.log('RESULT:', JSON.stringify(res, null, 2));
      console.log('====================================');
      return res;
    } catch (err) {
      console.log('====================================');
      console.log('[SignalR] INVOKE EXCEPTION:', err);
      console.log('====================================');
      throw err;
    }
  }
}

export const signalRService = new SignalRService();
