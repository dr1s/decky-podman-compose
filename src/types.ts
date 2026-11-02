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
