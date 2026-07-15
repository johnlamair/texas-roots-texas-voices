<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import maplibregl, {
    type Map as MapType,
    type LngLatLike,
    type GeoJSONSource,
    type StyleSpecification,
    type MapMouseEvent,
    type MapGeoJSONFeature
  } from 'maplibre-gl';
  const {
    AttributionControl,
    Map,
    NavigationControl,
    Popup,
    GeolocateControl
  } = maplibregl;
  import 'maplibre-gl/dist/maplibre-gl.css';
  import markerImage from '$lib/assets/marker.png';
  import styleJson from '$lib/data/pmtiles/style.json';
  import tx23Boundary from '$lib/data/tx23.json';
  const style = styleJson as StyleSpecification;
  import addMarkerImage from '$lib/assets/add-marker.png';
  import { activeMarkerCoords } from '../stores';
  import {
    expandBBox,
    getFeatureCollectionBounds,
    isPointInsideGeometry
  } from '$lib/utils/geo';
  import { ISSUES, flowerAsset } from '$lib/data/issues';
  import type {
    FeatureCollection,
    Point,
    GeoJsonProperties,
    MultiPolygon,
    Polygon
  } from 'geojson';

  // Eagerly import all flower assets so Vite bundles them
  const flowerImages: Record<string, string> = Object.fromEntries(
    ISSUES.map((issue) => [
      issue.slug,
      new URL(`./assets/${flowerAsset(issue.slug)}`, import.meta.url).href
    ])
  );

  let map: MapType;
  let mapContainer: HTMLDivElement;
  let isMomentLayerClicked = false;

  const tx23GeoJSON = tx23Boundary as unknown as FeatureCollection<
    Polygon | MultiPolygon
  >;

  const texasBounds = new maplibregl.LngLatBounds(
    [-106.645646, 25.837377],
    [-93.508292, 36.500704]
  );

  const texasViewBox = expandBBox(
    {
      minLng: texasBounds.getWest(),
      minLat: texasBounds.getSouth(),
      maxLng: texasBounds.getEast(),
      maxLat: texasBounds.getNorth()
    },
    0.5
  );

  const texasViewBounds = new maplibregl.LngLatBounds(
    [texasViewBox.minLng, texasViewBox.minLat - 1.6],
    [texasViewBox.maxLng, texasViewBox.maxLat]
  );

  const tx23Bounds = getFeatureCollectionBounds(
    tx23GeoJSON as unknown as FeatureCollection
  );

  const tx23Geometry = tx23GeoJSON.features[0].geometry as
    | Polygon
    | MultiPolygon;

  const initialState = {
    lng: (tx23Bounds.minLng + tx23Bounds.maxLng) / 2,
    lat: (tx23Bounds.minLat + tx23Bounds.maxLat) / 2,
    zoom: 6.6
  };

  const markerHeight = 39;
  const markerId = 'moments';
  const markerLayerId = 'moments-layer';
  const activeMarkerSourceId = 'active-marker-source';
  const activeMarkerLayerId = 'active-marker-layer';

  const activeMarkerGeoJSON: FeatureCollection<Point, GeoJsonProperties> = {
    type: 'FeatureCollection',
    features: []
  };

  async function getMoment(id?: number | string) {
    try {
      const response = await fetch(`/moment/${id}`);
      const moment = await response.json();
      return moment.description;
    } catch (error) {
      console.error('Error fetching moment:', error);
      return '';
    }
  }

  async function loadImageAndAddToMap(
    map: MapType,
    imageUrl: string,
    imageId: string
  ) {
    try {
      const image = await map.loadImage(imageUrl);
      map.addImage(imageId, image.data);
    } catch (error) {
      console.error(`Error loading image (${imageUrl}):`, error);
    }
  }

  function addPinLayer(
    map: MapType,
    layerId: string,
    sourceId: string,
    iconImage: string | maplibregl.ExpressionSpecification,
    layout: object = {},
    paint: object = {}
  ) {
    map.addLayer({
      id: layerId,
      type: 'symbol',
      source: sourceId,
      layout: {
        'icon-allow-overlap': true,
        'icon-image': iconImage,
        'icon-size': 0.5,
        'icon-anchor': 'bottom',
        ...layout
      },
      paint
    });
  }

  onMount(() => {
    const isMobile = window.matchMedia('(max-width: 800px)').matches;

    map = new Map({
      container: mapContainer,
      style: style,
      center: [initialState.lng, initialState.lat],
      zoom: isMobile ? 6.2 : initialState.zoom,
      minZoom: 3,
      maxZoom: 18,
      attributionControl: false
    });
    map.addControl(
      new AttributionControl({
        compact: true
      })
    );
    map.addControl(
      new NavigationControl({ showCompass: false }),
      'bottom-right'
    );
    map.addControl(
      new GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        }
      }),
      'bottom-right'
    );

    map.keyboard.enable();

    map.on('load', async () => {
      map.setMaxBounds(texasViewBounds);

      const texasCamera = map.cameraForBounds(texasViewBounds, {
        padding: 40
      });
      if (texasCamera?.zoom !== undefined) {
        map.setMinZoom(texasCamera.zoom);
      }

      map.addSource('tx23-boundary', {
        type: 'geojson',
        data: tx23GeoJSON
      });

      map.addLayer({
        id: 'tx23-boundary-outline',
        type: 'line',
        source: 'tx23-boundary',
        paint: {
          'line-color': '#2f4f2f',
          'line-width': 3,
          'line-opacity': 0.9
        }
      });

      map.fitBounds(
        [
          [tx23Bounds.minLng, tx23Bounds.minLat],
          [tx23Bounds.maxLng, tx23Bounds.maxLat]
        ],
        {
          padding: isMobile ? 92 : 48,
          duration: 0
        }
      );

      map.addSource(markerId, {
        type: 'geojson',
        data: 'data/moments.json'
      });

      try {
        await loadImageAndAddToMap(map, markerImage, 'marker');
        await loadImageAndAddToMap(map, addMarkerImage, 'add-marker');
        // Load all flower icons
        for (const issue of ISSUES) {
          await loadImageAndAddToMap(
            map,
            flowerImages[issue.slug],
            `flower-${issue.slug}`
          );
        }
      } catch (error) {
        console.error('Error loading marker images:', error);
      }

      // Expression: pick flower icon by issue property, fall back to default marker
      const flowerIconExpression = [
        'match',
        ['coalesce', ['get', 'issue'], 'other'],
        ...ISSUES.flatMap(
          (issue) => [issue.slug, `flower-${issue.slug}`] as const
        ),
        'marker'
      ] as unknown as maplibregl.ExpressionSpecification;

      addPinLayer(
        map,
        markerLayerId,
        markerId,
        flowerIconExpression,
        {},
        {
          'icon-opacity': 1
        }
      );

      map.addSource(activeMarkerSourceId, {
        type: 'geojson',
        data: activeMarkerGeoJSON
      });
      addPinLayer(map, activeMarkerLayerId, activeMarkerSourceId, 'add-marker');

      map.on(
        'click',
        markerLayerId,
        function (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) {
          isMomentLayerClicked = true;
          if (!e.features || e.features.length === 0) {
            return;
          }

          const feature = e.features[0];
          if (feature.geometry.type !== 'Point') {
            return;
          }

          const coordinates = (feature.geometry as Point).coordinates;
          if (typeof feature.id !== 'number') {
            console.error('Invalid feature id:', feature.id);
            return;
          }

          const issueSlug =
            typeof feature.properties?.issue === 'string'
              ? feature.properties.issue
              : 'other';
          const issueLabel =
            ISSUES.find((issue) => issue.slug === issueSlug)?.label ??
            'Something Else Close to Home';

          getMoment(feature.id)
            .then((text) => {
              const description = text;
              if (coordinates.length === 2) {
                const popupHtml = `<div class="moment-popup__issue">Main issue: ${issueLabel}</div>${description}`;
                new Popup({
                  offset: [0, -markerHeight],
                  anchor: 'bottom',
                  maxWidth: 'none'
                })
                  .setLngLat(coordinates as LngLatLike)
                  .setHTML(popupHtml)
                  .addTo(map);
              } else {
                console.error('Invalid coordinates format');
              }
            })
            .catch((error) => {
              console.error('Error fetching moment:', error);
            });
        }
      );

      let hoveredFeatureId: number | null = null;

      const pointerHoverHandler = (
        e: MapMouseEvent & { features?: MapGeoJSONFeature[] }
      ) => {
        map.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const newHoveredFeatureId = e.features[0].id as number;
          if (
            hoveredFeatureId !== null &&
            hoveredFeatureId !== newHoveredFeatureId
          ) {
            map.setFeatureState(
              { source: markerId, id: hoveredFeatureId },
              { hover: false }
            );
          }
          hoveredFeatureId = newHoveredFeatureId;
          map.setFeatureState(
            { source: markerId, id: hoveredFeatureId },
            { hover: true }
          );
        }
      };
      map.on('mouseenter', markerLayerId, pointerHoverHandler);
      map.on('mousemove', markerLayerId, pointerHoverHandler);

      map.on('mouseleave', markerLayerId, function () {
        map.getCanvas().style.cursor = '';
        if (hoveredFeatureId !== null) {
          map.setFeatureState(
            { source: markerId, id: hoveredFeatureId },
            { hover: false }
          );
          hoveredFeatureId = null;
        }
      });

      map.on('click', (e: MapMouseEvent) => {
        if (isMomentLayerClicked) {
          isMomentLayerClicked = false;
          return;
        }

        const { lng, lat } = e.lngLat;
        if (!isPointInsideGeometry([lng, lat], tx23Geometry)) {
          return;
        }
        activeMarkerCoords.set({ lng, lat });
      });
    });
  });

  $: {
    if ($activeMarkerCoords) {
      activeMarkerGeoJSON.features = [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [$activeMarkerCoords.lng, $activeMarkerCoords.lat]
          },
          properties: {}
        }
      ];

      const source = map?.getSource(activeMarkerSourceId) as GeoJSONSource;
      if (source) {
        source.setData(activeMarkerGeoJSON);
      }
    }
  }

  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });
</script>

<div id="map" bind:this={mapContainer}></div>

<style>
  #map {
    position: absolute;
    width: 100%;
    height: 100%;
  }
</style>
