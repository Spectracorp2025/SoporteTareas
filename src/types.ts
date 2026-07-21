export type UserRole = 'ADMIN' | 'WORKER';
export type UserStatus = 'PENDIENTE_REGISTRO' | 'PENDIENTE_APROBACION' | 'APROBADO' | 'RECHAZADO';
export type TaskPriority = 'NORMAL' | 'IMPORTANTE' | 'URGENTE';
export type TaskStatus = 'PENDIENTE' | 'ACEPTADA' | 'EN_PROCESO' | 'PENDIENTE_REVISION' | 'APROBADA' | 'RECHAZADA';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  fullName?: string;
  age?: number;
  country?: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  rejectionReason?: string;
  createdAt: string;
}

export interface Task {
  id: string; // Dynamic Firebase or Local ID
  code: string; // Unique alphanumeric code (e.g., TSK-1234)
  title: string;
  description: string;
  createdAt: string;
  deadline: string;
  deadlineTime?: string;
  priority: TaskPriority;
  assignedTo: string; // UID of the worker
  assignedToName: string; // Name of the worker
  requiresSupportMaterial: boolean;
  status: TaskStatus;
  rejectionComment?: string;
  history: TaskHistoryItem[];
}

export interface TaskHistoryItem {
  id: string;
  status: TaskStatus;
  changedBy: string;
  changedByName: string;
  timestamp: string;
  comment?: string;
}

export interface SystemSettings {
  weeklyPaymentCOP: number;
  adminWhatsApp: string;
  groupWhatsAppLink: string;
  businessProfileWhatsAppLink: string;
  teamName: string;
  logoUrl: string;
  primaryColor: string; // Hex color code
}

export interface SystemNotification {
  id: string;
  userId: string; // Target user or 'ADMIN'
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  type: 'INFO' | 'URGENT' | 'ALERT' | 'SUCCESS';
}

export interface SystemLog {
  id: string;
  action: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  timestamp: string;
  details?: string;
}

export interface PaymentCalculation {
  uid: string;
  fullName: string;
  totalTasks: number;
  approvedTasks: number;
  pendingTasks: number;
  rejectedTasks: number;
  fulfillmentRate: number; // percentage (0 - 100)
  suggestedPayment: number; // in COP
  missingTasks: number; // non-approved tasks
}
