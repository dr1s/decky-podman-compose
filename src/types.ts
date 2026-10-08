export interface Stack {
  name: string;
  path: string;
}

export interface ServiceStatus {
  name: string;
  state: string;
  health: string;
  status: string;
}

export interface StackStatusDetail {
  status: string;
  services: ServiceStatus[];
}
