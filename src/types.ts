export type OperationType = 
  | 'buffer' 
  | 'simplify' 
  | 'dissolve' 
  | 'centroid' 
  | 'convexHull' 
  | 'polygonToLine' 
  | 'lineToPolygon' 
  | 'explode' 
  | 'flatten' 
  | 'combine' 
  | 'filter';

export interface WorkflowStep {
  id: string;
  type: OperationType;
  params: Record<string, any>;
}

export interface GISFile {
  name: string;
  data: any; // GeoJSON
  type: string;
}

export interface MapLayer {
  id: string;
  name: string;
  data: any; // GeoJSON
  visible: boolean;
  color: string;
}
