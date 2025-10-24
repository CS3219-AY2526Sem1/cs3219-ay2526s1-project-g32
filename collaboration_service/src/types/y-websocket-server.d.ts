declare module '@y/websocket-server/utils' {
  import type { IncomingMessage } from 'http';
  import type { WebSocket } from 'ws';
  import type { Awareness } from 'y-protocols/awareness';
  import type * as Y from 'yjs';

  export interface WSSharedDoc extends Y.Doc {
    name: string;
    conns: Map<any, Set<number>>;
    awareness: Awareness;
    whenInitialized: Promise<void>;
  }

  export const docs: Map<string, WSSharedDoc>;
  export const getYDoc: (docname: string, gc?: boolean) => WSSharedDoc;
  export const setPersistence: (persistence: unknown) => void;
  export const getPersistence: () => unknown;
  export const setContentInitializor: (initializer: (ydoc: Y.Doc) => Promise<void>) => void;
  export const setupWSConnection: (
    conn: WebSocket,
    req: IncomingMessage,
    options?: { docName?: string; gc?: boolean },
  ) => void;
}
