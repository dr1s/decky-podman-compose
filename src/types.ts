export interface Stack {
  name: string;
  path: string;
}

export interface ServiceStatus {
  name: string;
  state: string;
  health: string;
}

export interface StackStatusDetail {
  services: ServiceStatus[];
}
