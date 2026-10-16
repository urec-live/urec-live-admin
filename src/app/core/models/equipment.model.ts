import { Exercise } from './exercise.model';

/** 'Out of Order' blocks member check-ins; only admins can set it. */
export type EquipmentStatus = 'Available' | 'In Use' | 'Reserved' | 'Out of Order';

export interface Equipment {
  id: number;
  code: string;
  name: string;
  status: EquipmentStatus;
  imageUrl?: string;
  deleted: boolean;
  exercises: Exercise[];
}

export interface CreateEquipmentRequest {
  name: string;
  code: string;
  status: EquipmentStatus;
}

export interface UpdateEquipmentRequest {
  name?: string;
  code?: string;
  status?: EquipmentStatus;
}
