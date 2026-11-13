export interface FloorArea {
  id: string;
  name: string;
  kind: string;
  shape: 'rect' | 'polygon';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  points?: { x: number; y: number }[];
}
export interface FloorLayout {
  version: 1;
  areas: FloorArea[];
}
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
  layout?: FloorLayout | null;
  illustrative?: boolean;
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
