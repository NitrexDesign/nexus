// User types
export interface User {
  id: string;
  username: string;
  displayName: string;
  approved: boolean;
  passwordHash?: string | null;
}

export interface Credential {
  id: Buffer;
  userId: string;
  publicKey: Buffer;
  attestationType: string;
  aaguid: Buffer;
  signCount: number;
  cloneWarning: boolean;
  backupEligible: boolean;
  backupState: boolean;
}

// Service types
export interface Service {
  id: string;
  name: string;
  url: string;
  icon: string;
  group: string;
  order: number;
  public: boolean;
  authRequired: boolean;
  newTab: boolean;
  checkHealth: boolean;
  healthStatus: "online" | "offline" | "unknown";
  lastChecked: Date | null;
}

// Widget types
export interface WidgetSettings {
  id: string;
  categoryOrder: string[] | null;
  gridCols: number;
  gridRows: number;
  updatedAt: Date;
}

export interface WidgetConfig {
  id: string;
  widgetType: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  settings: Record<string, any>;
  enabled: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Health check types
export interface HealthPoint {
  timestamp: Date;
  upCount: number;
  downCount: number;
  latency: number;
}

export interface UptimeHistory {
  serviceId: string;
  hourly: HealthPoint[];
  daily: HealthPoint[];
}

// Auth types
export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

// Icon types
export interface IconSearchResult {
  url: string;
  type: "favicon" | "apple-touch-icon" | "og:image" | "icon";
}
