import { supabase } from '../clients/supabaseClient';
import fs from 'fs';
import path from 'path';
import type {
  FeatureCollection,
  GeoJsonProperties,
  Point,
  Polygon,
  MultiPolygon,
  FeatureCollection as GeoJsonFeatureCollection
} from 'geojson';
import { roundCoordinates } from '$lib/utils/utils';
import tx23Boundary from '$lib/data/tx23.json';
import { isPointInsideGeometry } from '$lib/utils/geo';

type Moment = {
  short_id: number;
  location: {
    coordinates: [number, number];
  };
  description?: string;
  issue?: string | null;
};

const tx23GeoJSON = tx23Boundary as unknown as GeoJsonFeatureCollection<
  Polygon | MultiPolygon
>;
const tx23Geometry = tx23GeoJSON.features[0].geometry as Polygon | MultiPolygon;

export async function fetchIdCoords(): Promise<FeatureCollection<
  Point,
  GeoJsonProperties
> | null> {
  const { data, error } = await supabase
    .from('moments')
    .select('short_id, location, issue')
    .eq('status', 'approved');

  if (error) {
    console.error('Error fetching id and coordinate pairs:', error);
    return null;
  }

  const filtered = (data as unknown as Moment[]).filter((moment) =>
    isPointInsideGeometry(moment.location.coordinates, tx23Geometry)
  );

  const geoJson: FeatureCollection<Point, GeoJsonProperties> = {
    type: 'FeatureCollection',
    features: filtered.map((moment) => ({
      type: 'Feature',
      id: moment.short_id,
      geometry: {
        type: 'Point',
        coordinates: roundCoordinates(moment.location.coordinates, 6)
      },
      properties: { issue: moment.issue ?? 'other' }
    }))
  };

  return geoJson;
}

export async function fetchIdDescriptions(): Promise<Record<
  number,
  string
> | null> {
  const { data, error } = await supabase
    .from('moments')
    .select('short_id, description, location')
    .eq('status', 'approved');

  if (error) {
    console.error('Error fetching id and description pairs:', error);
    return null;
  }

  const descriptions: Record<number, string> = (data as unknown as Moment[])
    .filter((moment) =>
      isPointInsideGeometry(moment.location.coordinates, tx23Geometry)
    )
    .reduce(
      (acc, moment) => {
        acc[moment.short_id] = moment.description ?? '';
        return acc;
      },
      {} as Record<number, string>
    );

  return descriptions;
}

export async function writeGeoJsonToFile(
  geoJson: FeatureCollection<Point, GeoJsonProperties>
): Promise<string> {
  const outputDir = path.resolve('static/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.resolve(outputDir, 'moments.json');
  await fs.promises.writeFile(filePath, JSON.stringify(geoJson));
  return filePath;
}

export async function writeDescriptionsToFile(
  descriptions: Record<number, string>
): Promise<string> {
  const outputDir = path.resolve('static/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.resolve(outputDir, 'descriptions.json');
  await fs.promises.writeFile(filePath, JSON.stringify(descriptions));
  return filePath;
}

export async function fetchAndWriteData() {
  const geoJson = await fetchIdCoords();
  const descriptions = await fetchIdDescriptions();

  if (!geoJson || !descriptions) {
    console.error('Failed to fetch data, aborting file write.');
    process.exit(1);
  }

  const geoJsonFilePath = await writeGeoJsonToFile(geoJson);
  const descriptionsFilePath = await writeDescriptionsToFile(descriptions);

  console.log(
    `Fetched ${geoJson.features.length} moments and saved to ${geoJsonFilePath}`
  );
  console.log(
    `Fetched ${Object.keys(descriptions).length} descriptions and saved to ${descriptionsFilePath}`
  );
}

fetchAndWriteData().catch((err) => {
  console.error('Error in fetchAndWriteData:', err);
  process.exit(1);
});
