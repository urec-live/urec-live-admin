import { Exercise } from './exercise.model';

export type EquipmentStatus = 'Available' | 'In Use' | 'Reserved';

export interface Equipment {
  id: number;
  code: string;
  name: string;
  status: EquipmentStatus;
  imageUrl?: string;
  deleted: boolean;
  exercises: Exercise[];
}
