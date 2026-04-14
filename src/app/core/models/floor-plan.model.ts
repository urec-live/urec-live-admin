export interface FloorPlanEquipment {
  id: number;
  code: string;
  name: string;
  status: string;
  exercise: string;
  floorX: number | null;
  floorY: number | null;
  floorLabel: string | null;
  floorPlanId: number | null;
}

export interface FloorPlan {
  id: number;
  name: string;
  imageUrl: string | null;
  width: number;
  height: number;
  floorNumber: number;
  equipment: FloorPlanEquipment[];
}

export interface CreateFloorPlanRequest {
  name: string;
  width: number;
  height: number;
  floorNumber: number;
}

export interface EquipmentPosition {
  equipmentId: number;
  floorX: number;
  floorY: number;
  floorLabel?: string;
}
