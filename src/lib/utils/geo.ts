import type {
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Polygon,
  Position
} from 'geojson';

export type BBox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

export function expandBBox(bounds: BBox, padding: number): BBox {
  return {
    minLng: bounds.minLng - padding,
    minLat: bounds.minLat - padding,
    maxLng: bounds.maxLng + padding,
    maxLat: bounds.maxLat + padding
  };
}

function isPointInRing(point: Position, ring: Position[]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function getGeometryBounds(geometry: Geometry): BBox {
  const bounds: BBox = {
    minLng: Number.POSITIVE_INFINITY,
    minLat: Number.POSITIVE_INFINITY,
    maxLng: Number.NEGATIVE_INFINITY,
    maxLat: Number.NEGATIVE_INFINITY
  };

  const updateBounds = (position: Position) => {
    const [lng, lat] = position;
    bounds.minLng = Math.min(bounds.minLng, lng);
    bounds.minLat = Math.min(bounds.minLat, lat);
    bounds.maxLng = Math.max(bounds.maxLng, lng);
    bounds.maxLat = Math.max(bounds.maxLat, lat);
  };

  const walk = (value: unknown) => {
    if (!Array.isArray(value)) {
      return;
    }

    if (
      value.length >= 2 &&
      typeof value[0] === 'number' &&
      typeof value[1] === 'number'
    ) {
      updateBounds(value as Position);
      return;
    }

    value.forEach(walk);
  };

  if (geometry.type === 'GeometryCollection') {
    geometry.geometries.forEach((g) => {
      const sub = getGeometryBounds(g);
      bounds.minLng = Math.min(bounds.minLng, sub.minLng);
      bounds.minLat = Math.min(bounds.minLat, sub.minLat);
      bounds.maxLng = Math.max(bounds.maxLng, sub.maxLng);
      bounds.maxLat = Math.max(bounds.maxLat, sub.maxLat);
    });
  } else {
    walk(geometry.coordinates);
  }

  return bounds;
}

export function getFeatureCollectionBounds(
  featureCollection: FeatureCollection
): BBox {
  return featureCollection.features.reduce<BBox>(
    (acc, feature) => {
      const featureBounds = getGeometryBounds(feature.geometry);
      return {
        minLng: Math.min(acc.minLng, featureBounds.minLng),
        minLat: Math.min(acc.minLat, featureBounds.minLat),
        maxLng: Math.max(acc.maxLng, featureBounds.maxLng),
        maxLat: Math.max(acc.maxLat, featureBounds.maxLat)
      };
    },
    {
      minLng: Number.POSITIVE_INFINITY,
      minLat: Number.POSITIVE_INFINITY,
      maxLng: Number.NEGATIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY
    }
  );
}

export function isPointInsideGeometry(
  point: Position,
  geometry: Polygon | MultiPolygon
): boolean {
  if (geometry.type === 'Polygon') {
    return isPointInRing(point, geometry.coordinates[0]);
  }

  return geometry.coordinates.some((polygon) =>
    isPointInRing(point, polygon[0])
  );
}

export function randomPointInGeometry(
  geometry: Polygon | MultiPolygon,
  maxAttempts = 10000
): Position {
  const bounds = getGeometryBounds(geometry);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate: Position = [
      Math.random() * (bounds.maxLng - bounds.minLng) + bounds.minLng,
      Math.random() * (bounds.maxLat - bounds.minLat) + bounds.minLat
    ];

    if (isPointInsideGeometry(candidate, geometry)) {
      return candidate;
    }
  }

  throw new Error('Unable to generate a point inside the target geometry');
}
