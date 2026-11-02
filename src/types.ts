export interface Stack {
  name: string;
  path: string;
}

export interface ServiceStatus {
  name: string;
  state: string;
  health?: string;
}

export interface StackStatusDetail {
  services: ServiceStatus[];
}

export interface ContainerStats {
  name: string;
  cpu?: string;
  mem_usage?: string;
  mem_percent?: string;
  net_io?: string;
  block_io?: string;
  pids?: string;
}

export interface StackStats {
  services: ContainerStats[];
}

export interface RouteComponentProps {
  location: {
    search: string;
    pathname: string;
    hash: string;
    state?: unknown;
  };
  match: {
    params: Record<string, string>;
    isExact: boolean;
    path: string;
    url: string;
  };
  history: {
    push: (path: string) => void;
    replace: (path: string) => void;
    goBack: () => void;
  };
}
