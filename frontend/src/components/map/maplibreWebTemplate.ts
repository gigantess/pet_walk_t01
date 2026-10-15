/**
 * [편안하개 - PetWalk]
 * 모바일 react-native-webview 용 고속 인라인 MapLibre HTML5 템플릿 (T-OFM-3, T-OFM-4)
 *
 * 1. OpenFreeMap 벡터 타일 실시간 렌더링 (MapLibre GL JS)
 * 2. 3색 안심 보행로(세그먼트) 벡터 라인 레이어 (casing + core)
 * 3. 200m 안심 마스킹 원(Polygon) 및 스텝 핀/마커 심볼 레이어
 * 4. 양방향 postMessage 통신 브릿지 (핀 선택, 카메라 자동 fitBounds, 테마 실시간 전환)
 */

import { RouteFeatureCollection, RouteStepPin, LonLat } from '../../types/route';
import { MapRouteColors } from '../../constants/mapStyles';

export interface BuildMapLibreHtmlOptions {
  readonly styleUrl: string;
  readonly route: RouteFeatureCollection;
  readonly stepPins?: readonly RouteStepPin[];
  readonly routeColors: MapRouteColors;
  readonly maskingCenter?: LonLat;
  readonly interactive?: boolean;
}

/**
 * 200m 마스킹 원 GeoJSON 다각형 좌표열 생성 헬퍼
 */
export function generateCirclePolygonCoordinates(
  center: LonLat,
  radiusMeters: number = 200,
  steps: number = 36,
): [number, number][] {
  const [centerLon, centerLat] = center;
  const coords: [number, number][] = [];
  const latRad = (centerLat * Math.PI) / 180;
  const radiusKm = radiusMeters / 1000;
  const lonRadius = radiusKm / (111.32 * Math.cos(latRad));
  const latRadius = radiusKm / 110.574;

  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * (2 * Math.PI);
    const x = lonRadius * Math.cos(angle);
    const y = latRadius * Math.sin(angle);
    coords.push([centerLon + x, centerLat + y]);
  }
  return coords;
}

/**
 * 모바일 WebView에 주입할 완전한 단일 HTML5 문자열을 생성합니다.
 */
export function buildMapLibreHtml({
  styleUrl,
  route,
  stepPins = [],
  routeColors,
  maskingCenter,
  interactive = true,
}: BuildMapLibreHtmlOptions): string {
  // 마스킹 원 GeoJSON 생성
  const maskingFeature = maskingCenter
    ? {
        type: 'Feature',
        properties: { name: '200m_safe_mask' },
        geometry: {
          type: 'Polygon',
          coordinates: [generateCirclePolygonCoordinates(maskingCenter, 200)],
        },
      }
    : null;

  const initialDataPayload = JSON.stringify({
    styleUrl,
    route,
    stepPins,
    routeColors,
    maskingFeature,
    interactive,
  });

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>PetWalk MapLibre Vector Map</title>
  <!-- MapLibre GL JS 공식 CDN (경량 무광고) -->
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5.1.0/dist/maplibre-gl.css" />
  <script src="https://unpkg.com/maplibre-gl@5.1.0/dist/maplibre-gl.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; overflow: hidden; background-color: #E8F1EC; }
    .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right { transform: scale(0.85); transform-origin: bottom; }
    
    /* 핀 및 마커 스타일 */
    .step-pin {
      width: 26px; height: 26px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #FFFFFF; font-weight: bold; font-size: 11px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 2px solid #FFFFFF;
      cursor: pointer; transition: transform 0.15s ease;
    }
    .step-pin:active { transform: scale(1.2); }
    .pin-turn { background-color: ${routeColors.normal}; }
    .pin-caution { background-color: ${routeColors.caution}; }
    .pin-safe { background-color: ${routeColors.safe}; }
    
    .start-marker {
      padding: 3px 8px; border-radius: 10px; background-color: ${routeColors.startMarker};
      color: #FFFFFF; font-weight: 800; font-size: 10px; border: 1.5px solid #FFFFFF;
      box-shadow: 0 2px 4px rgba(0,0,0,0.25); text-align: center;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script>
    (function() {
      const payload = ${initialDataPayload};
      let map = null;
      let markers = [];

      function postToReactNative(type, data) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, data: data }));
        }
      }

      // 모든 좌표 수집 및 Bounding Box 계산
      function computeBounds(featureCollection) {
        let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
        if (!featureCollection || !featureCollection.features) return null;
        
        featureCollection.features.forEach(function(f) {
          if (f.geometry && f.geometry.coordinates) {
            f.geometry.coordinates.forEach(function(pt) {
              const lon = pt[0], lat = pt[1];
              if (lon < minLon) minLon = lon;
              if (lon > maxLon) maxLon = lon;
              if (lat < minLat) minLat = lat;
              if (lat > maxLat) maxLat = lat;
            });
          }
        });
        if (minLon === Infinity) return null;
        return [[minLon, minLat], [maxLon, maxLat]];
      }

      // 지도 초기화
      const bounds = computeBounds(payload.route);
      const defaultCenter = bounds ? [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2] : [127.3805, 36.4315];

      map = new maplibregl.Map({
        container: 'map',
        style: payload.styleUrl,
        center: defaultCenter,
        zoom: 15,
        attributionControl: false,
        interactive: payload.interactive !== false,
      });

      // 축척 컨트롤 추가
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

      map.on('load', function() {
        initLayers(payload.route, payload.routeColors, payload.maskingFeature);
        initMarkers(payload.stepPins, payload.route);
        if (bounds) {
          map.fitBounds(bounds, { padding: 40, duration: 600 });
        }
        postToReactNative('MAP_LOADED', { ok: true });
      });

      // 벡터 소스 및 레이어 등록
      function initLayers(routeData, colors, maskData) {
        // 1. 200m 마스킹 원 소스 및 레이어 (있는 경우)
        if (maskData) {
          map.addSource('masking-source', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [maskData]
            }
          });
          map.addLayer({
            id: 'masking-fill',
            type: 'fill',
            source: 'masking-source',
            paint: {
              'fill-color': colors.maskCircle,
              'fill-opacity': 0.8
            }
          });
          map.addLayer({
            id: 'masking-line',
            type: 'line',
            source: 'masking-source',
            paint: {
              'line-color': colors.maskBorder,
              'line-width': 1.5,
              'line-dasharray': [2, 2]
            }
          });
        }

        // 2. 산책 경로 GeoJSON 소스
        map.addSource('route-source', {
          type: 'geojson',
          data: routeData
        });

        // 3. 경로 테두리 레이어 (Casing - 시인성 확보용 외곽선)
        map.addLayer({
          id: 'route-casing',
          type: 'line',
          source: 'route-source',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': colors.casing,
            'line-width': 8,
            'line-opacity': 0.95
          }
        });

        // 4. 경로 코어 레이어 (3색 세그먼트: safe, caution, normal)
        map.addLayer({
          id: 'route-core',
          type: 'line',
          source: 'route-source',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': [
              'match',
              ['get', 'segmentType'],
              'safe', colors.safe,
              'caution', colors.caution,
              colors.normal
            ],
            'line-width': 5
          }
        });
      }

      // 스텝 핀 및 마커 등록
      function initMarkers(pins, routeData) {
        markers.forEach(function(m) { m.remove(); });
        markers = [];

        // 출발/도착 마커
        if (routeData && routeData.features && routeData.features.length > 0) {
          const firstCoord = routeData.features[0].geometry.coordinates[0];
          if (firstCoord) {
            const startEl = document.createElement('div');
            startEl.className = 'start-marker';
            startEl.innerText = '출발/도착 🐾';
            const m = new maplibregl.Marker({ element: startEl })
              .setLngLat(firstCoord)
              .addTo(map);
            markers.push(m);
          }
        }

        // 턴 바이 턴 스텝 핀
        if (pins && pins.length > 0) {
          pins.forEach(function(pin) {
            const el = document.createElement('div');
            el.className = 'step-pin pin-' + pin.kind;
            el.innerText = pin.kind === 'caution' ? '!' : (pin.kind === 'safe' ? '🌿' : '↱');
            el.onclick = function() {
              postToReactNative('PIN_SELECT', { id: pin.id, instruction: pin.instruction });
            };
            const m = new maplibregl.Marker({ element: el })
              .setLngLat(pin.position)
              .addTo(map);
            markers.push(m);
          });
        }
      }

      // 모바일(React Native)로부터의 동적 메시지 수신 처리
      window.addEventListener('message', function(event) {
        try {
          const msg = JSON.parse(event.data);
          if (msg.action === 'SET_STYLE' && msg.styleUrl) {
            map.setStyle(msg.styleUrl);
          } else if (msg.action === 'UPDATE_ROUTE' && msg.route) {
            const src = map.getSource('route-source');
            if (src) src.setData(msg.route);
            initMarkers(msg.stepPins || [], msg.route);
            const b = computeBounds(msg.route);
            if (b) map.fitBounds(b, { padding: 40, duration: 600 });
          }
        } catch(e) {}
      });
    })();
  </script>
</body>
</html>`;
}
