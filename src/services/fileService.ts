import shp from 'shpjs';
import * as toGeoJSON from '@tmcw/togeojson';
import { DOMParser } from 'xmldom';

export async function convertToGeoJSON(file: File): Promise<any> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  switch (extension) {
    case 'geojson':
    case 'json':
      const text = new TextDecoder().decode(arrayBuffer);
      return JSON.parse(text);
    
    case 'zip':
      // Assume Shapefile zip
      return await shp(arrayBuffer);
    
    case 'kml':
      const kmlText = new TextDecoder().decode(arrayBuffer);
      const kmlDom = new DOMParser().parseFromString(kmlText, 'text/xml');
      return toGeoJSON.kml(kmlDom);
    
    case 'gpx':
      const gpxText = new TextDecoder().decode(arrayBuffer);
      const gpxDom = new DOMParser().parseFromString(gpxText, 'text/xml');
      return toGeoJSON.gpx(gpxDom);
    
    default:
      throw new Error(`Unsupported file format: ${extension}`);
  }
}
