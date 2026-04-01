import * as turf from '@turf/turf';
import { WorkflowStep } from '../types';

export function processWorkflow(geojson: any, steps: WorkflowStep[]): any {
  let result = JSON.parse(JSON.stringify(geojson)); // Deep clone

  for (const step of steps) {
    try {
      switch (step.type) {
        case 'buffer':
          result = turf.buffer(result, step.params.distance || 1, { units: step.params.units || 'kilometers' });
          break;
        case 'simplify':
          result = turf.simplify(result, { tolerance: step.params.tolerance || 0.01, highQuality: false });
          break;
        case 'dissolve':
          // Dissolve works on FeatureCollection
          if (result.type === 'FeatureCollection') {
            result = turf.dissolve(result, { propertyName: step.params.property });
          }
          break;
        case 'centroid':
          // Centroid returns a point for each feature or one for the whole thing?
          // Turf.centroid returns a single point for the whole input.
          // If user wants centroid for each feature, we should map.
          if (step.params.perFeature && result.type === 'FeatureCollection') {
            result = turf.featureCollection(result.features.map((f: any) => turf.centroid(f)));
          } else {
            result = turf.centroid(result);
          }
          break;
        case 'convexHull':
          result = turf.convex(result);
          break;
        case 'polygonToLine':
          result = turf.polygonToLine(result);
          break;
        case 'lineToPolygon':
          result = turf.lineToPolygon(result);
          break;
        case 'explode':
          result = turf.explode(result);
          break;
        case 'flatten':
          result = turf.flatten(result);
          break;
        case 'combine':
          result = turf.combine(result);
          break;
        case 'filter':
          if (result.type === 'FeatureCollection' && step.params.property && step.params.value) {
            result.features = result.features.filter((f: any) => {
              const val = f.properties[step.params.property];
              // Simple equality for now
              return String(val) === String(step.params.value);
            });
          }
          break;
        default:
          console.warn(`Unknown operation: ${step.type}`);
      }
    } catch (err) {
      console.error(`Error in step ${step.type}:`, err);
      // Continue or break? Let's continue for now but log.
    }
  }

  return result;
}
