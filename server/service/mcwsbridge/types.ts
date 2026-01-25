export interface JsonRpcRequest<P = unknown> {
  jsonrpc: string;
  method: string;
  params?: P;
  id: string | null;
}

export interface JsonRpcResponse<R = unknown, E = unknown> {
  jsonrpc: string;
  result?: R;
  error?: {
    code: number;
    message: string;
    data?: E;
  };
  id: string | null;
}

export interface PendingRequest<T = unknown> {
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
  timeout: NodeJS.Timeout;
  peerId: string;
}

export interface CommandResult {
  success: boolean;
  message: string;
}
