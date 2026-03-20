export interface LinkedEquipment {
  id: number;
  name: string;
  code: string;
}

export interface Exercise {
  id: number;
  name: string;
  muscleGroup: string;
  gifUrl?: string;
  linkedEquipment: LinkedEquipment[];
}

export interface CreateExerciseRequest {
  name: string;
  muscleGroup: string;
  gifUrl?: string;
}

export interface UpdateExerciseRequest {
  name?: string;
  muscleGroup?: string;
  gifUrl?: string;
}
