/**
 * [편안하개 - PetWalk]
 * Web & Mobile 하이브리드 MapLibre 벡터 지도 뷰어 (T-OFM-3, T-OFM-4)
 * (docs/08_OpenFreeMap_MapLibre_배경지도_구현계획서.md)
 *
 * 1. Web: maplibre-gl WebGL 캔버스 직접 렌더링 (초고속, 제로 레이턴시)
 * 2. Mobile (Android / iOS): react-native-webview 기반 인라인 HTML5 브릿지
 * 3. 3색 안심 보행로(세그먼트) 벡터 라인 렌더링 (안심/일반/주의)
 * 4. 200m 안심 마스킹 원 및 스텝 핀/출발점 마커 심볼 렌더링
 * 5. 3대 앱 테마 실시간 동기화 지원 (useMapThemeStyle)
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, StyleSheet, Platform, StyleProp, ViewStyle } from 'react-native';
import WebView from 'react-native-webview';
import { RouteFeatureCollection, RouteStepPin, LonLat } from '../../types/route';
import { useMapThemeStyle } from '../../constants/mapStyles';
import { buildMapLibreHtml } from './maplibreWebTemplate';

function getRouteBounds(routeData: RouteFeatureCollection): [[number, number], [number, number]] | null {
  const coordinates = routeData.features.flatMap((feature) => feature.geometry.coordinates);
  if (coordinates.length === 0) return null;
  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);
  return [
    [Math.min(...longitudes), Math.min(...latitudes)],
    [Math.max(...longitudes), Math.max(...latitudes)],
  ];
}

export interface MapLibreMapViewProps {
  readonly route: RouteFeatureCollection;
  readonly stepPins?: readonly RouteStepPin[];
  readonly speedKmH?: number;
  readonly width?: number | string;
  readonly height?: number | string;
  readonly maskingCenter?: LonLat;
  readonly onPinSelect?: (instruction: string) => void;
  readonly onMapLoaded?: () => void;
  readonly style?: StyleProp<ViewStyle>;
  readonly interactive?: boolean;
}

export const MapLibreMapView: React.FC<MapLibreMapViewProps> = ({
  route,
  stepPins = [],
  width = '100%',
  height = 260,
  maskingCenter,
  onPinSelect,
  onMapLoaded,
  style,
  interactive = true,
}) => {
  const { mapStyleUrl, routeColors } = useMapThemeStyle();
  const isWeb = Platform.OS === 'web';

  // ============================================================================
  // 1. 웹 환경 (Expo Web) - maplibre-gl 직접 마운트
  // ============================================================================
  const webContainerRef = useRef<HTMLDivElement | null>(null);
  const webMapInstanceRef = useRef<any>(null);
  const webMapLoadedRef = useRef(false);
  const webMarkersRef = useRef<any[]>([]);
  const latestRouteRef = useRef(route);
  const latestPinsRef = useRef(stepPins);
  const latestRouteColorsRef = useRef(routeColors);
  const latestOnMapLoadedRef = useRef(onMapLoaded);
  const latestOnPinSelectRef = useRef(onPinSelect);
  useEffect(() => {
    latestRouteRef.current = route;
    latestPinsRef.current = stepPins;
    latestRouteColorsRef.current = routeColors;
    latestOnMapLoadedRef.current = onMapLoaded;
    latestOnPinSelectRef.current = onPinSelect;
  }, [route, stepPins, routeColors, onMapLoaded, onPinSelect]);

  // 모든 좌표 Bounding Box 계산
  const routeBounds = useMemo(() => getRouteBounds(route), [route]);

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;

    let mapInstance: any = null;
    let isDisposed = false;

    function updateWebMarkers(map: any, maplibregl: any, routeData: RouteFeatureCollection, pins: readonly RouteStepPin[]) {
      webMarkersRef.current.forEach((marker) => marker.remove());
      webMarkersRef.current = [];

      const firstCoord = routeData.features[0]?.geometry.coordinates[0];
      if (firstCoord) {
        const startElement = document.createElement('div');
        startElement.textContent = '출발/도착 🐾';
        Object.assign(startElement.style, {
          padding: '3px 8px', borderRadius: '10px', background: latestRouteColorsRef.current.startMarker,
          color: '#fff', fontSize: '10px', fontWeight: '800', border: '1.5px solid #fff',
          whiteSpace: 'nowrap',
        });
        webMarkersRef.current.push(new maplibregl.Marker({ element: startElement }).setLngLat(firstCoord).addTo(map));
      }

      pins.forEach((pin) => {
        const element = document.createElement(pin.title ? 'div' : 'button');
        if (!pin.title) (element as HTMLButtonElement).type = 'button';
        element.setAttribute('aria-label', pin.instruction);
        element.textContent = pin.icon ?? (pin.kind === 'caution' ? '!' : pin.kind === 'safe' ? '🌿' : '↱');
        Object.assign(element.style, {
          width: pin.title ? 'auto' : '28px', height: pin.title ? 'auto' : '28px',
          borderRadius: pin.title ? '10px' : '50%', border: `2px solid ${pin.title ? '#fff' : '#fff'}`,
          padding: pin.title ? '4px 6px' : '0',
          background: pin.title ? '#ffffffed' : pin.kind === 'caution' ? latestRouteColorsRef.current.caution : pin.kind === 'safe' ? latestRouteColorsRef.current.safe : latestRouteColorsRef.current.normal,
          color: pin.title ? '#1f2937' : '#fff', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 5px #0005',
          fontSize: pin.title ? '10px' : '13px', whiteSpace: 'nowrap', textAlign: 'center',
        });
        if (pin.title) {
          element.replaceChildren();
          element.style.display = 'grid';
          element.style.justifyItems = 'center';
          element.style.gap = '2px';
          const icon = document.createElement('span');
          icon.textContent = pin.icon ?? '';
          const title = document.createElement('strong');
          title.textContent = pin.title;
          element.append(icon, title);
          if (pin.detail) {
            const detail = document.createElement('small');
            detail.textContent = pin.detail;
            element.appendChild(detail);
          }
        }
        element.addEventListener('click', () => latestOnPinSelectRef.current?.(pin.instruction));
        webMarkersRef.current.push(new maplibregl.Marker({ element, anchor: pin.title ? 'bottom' : 'center' }).setLngLat([...pin.position]).addTo(map));
      });
    }

    async function initWebMap() {
      try {
        const maplibregl = await import('maplibre-gl');
        if (isDisposed || !webContainerRef.current) return;

        const initialBounds = getRouteBounds(latestRouteRef.current);
        const defaultCenter: [number, number] = initialBounds
          ? [(initialBounds[0][0] + initialBounds[1][0]) / 2, (initialBounds[0][1] + initialBounds[1][1]) / 2]
          : [127.3805, 36.4315];

        mapInstance = new maplibregl.Map({
          container: webContainerRef.current,
          style: mapStyleUrl,
          center: defaultCenter,
          zoom: 15,
          interactive,
          attributionControl: false,
        });

        webMapInstanceRef.current = mapInstance;

        mapInstance.on('load', () => {
          if (isDisposed) return;
          webMapLoadedRef.current = true;
          const currentRoute = latestRouteRef.current;
          const currentPins = latestPinsRef.current;
          const currentColors = latestRouteColorsRef.current;

          // 1. 산책 경로 GeoJSON 소스 등록
          mapInstance.addSource('route-source', {
            type: 'geojson',
            data: currentRoute,
          });

          // 2. 경로 외곽 테두리 (Casing)
          mapInstance.addLayer({
            id: 'route-casing',
            type: 'line',
            source: 'route-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': currentColors.casing,
              'line-width': 8,
              'line-opacity': 0.95,
            },
          });

          // 3. 경로 코어 (3색 세그먼트: safe, caution, normal)
          mapInstance.addLayer({
            id: 'route-core',
            type: 'line',
            source: 'route-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': [
                'match',
                ['get', 'segmentType'],
                'safe', currentColors.safe,
                'caution', currentColors.caution,
                currentColors.normal,
              ],
              'line-width': 5,
            },
          });

          // 4. 카메라 Bounding Box 피팅
          const initialBounds = getRouteBounds(currentRoute);
          if (initialBounds) {
            mapInstance.fitBounds(initialBounds, { padding: 40, duration: 600 });
          }

          updateWebMarkers(mapInstance, maplibregl, currentRoute, currentPins);

          latestOnMapLoadedRef.current?.();
        });
      } catch {
        // WebGL 미지원 또는 SSR 테스트 환경 에러 방어
      }
    }

    void initWebMap();

    return () => {
      isDisposed = true;
      if (webMapInstanceRef.current) {
        try {
          webMapInstanceRef.current.remove();
        } catch {}
        webMapInstanceRef.current = null;
      }
      webMapLoadedRef.current = false;
      webMarkersRef.current = [];
    };
  }, [isWeb, mapStyleUrl, interactive]);

  useEffect(() => {
    if (!isWeb || !webMapLoadedRef.current || !webMapInstanceRef.current) return;
    const map = webMapInstanceRef.current;
    const source = map.getSource('route-source');
    if (!source) return;
    source.setData(route);
    const updateMarkers = async () => {
      const maplibregl = await import('maplibre-gl');
      if (!webMapInstanceRef.current || !webMapLoadedRef.current) return;
      webMarkersRef.current.forEach((marker) => marker.remove());
      webMarkersRef.current = [];
      const firstCoord = route.features[0]?.geometry.coordinates[0];
      if (firstCoord) {
        const element = document.createElement('div');
        element.textContent = '출발/도착 🐾';
        Object.assign(element.style, { padding: '3px 8px', borderRadius: '10px', background: routeColors.startMarker, color: '#fff', fontSize: '10px', fontWeight: '800', border: '1.5px solid #fff', whiteSpace: 'nowrap' });
        webMarkersRef.current.push(new maplibregl.Marker({ element }).setLngLat([...firstCoord]).addTo(map));
      }
      stepPins.forEach((pin) => {
        const element = document.createElement(pin.title ? 'div' : 'button');
        if (!pin.title) (element as HTMLButtonElement).type = 'button';
        element.setAttribute('aria-label', pin.instruction);
        element.textContent = pin.icon ?? (pin.kind === 'caution' ? '!' : pin.kind === 'safe' ? '🌿' : '↱');
        Object.assign(element.style, { width: pin.title ? 'auto' : '28px', height: pin.title ? 'auto' : '28px', borderRadius: pin.title ? '10px' : '50%', border: '2px solid #fff', padding: pin.title ? '4px 6px' : '0', background: pin.title ? '#ffffffed' : pin.kind === 'caution' ? routeColors.caution : pin.kind === 'safe' ? routeColors.safe : routeColors.normal, color: pin.title ? '#1f2937' : '#fff', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 5px #0005', fontSize: pin.title ? '10px' : '13px', whiteSpace: 'nowrap', textAlign: 'center' });
        if (pin.title) {
          element.replaceChildren();
          element.style.display = 'grid';
          element.style.justifyItems = 'center';
          element.style.gap = '2px';
          const icon = document.createElement('span');
          icon.textContent = pin.icon ?? '';
          const title = document.createElement('strong');
          title.textContent = pin.title;
          element.append(icon, title);
          if (pin.detail) {
            const detail = document.createElement('small');
            detail.textContent = pin.detail;
            element.appendChild(detail);
          }
        }
        element.addEventListener('click', () => onPinSelect?.(pin.instruction));
        webMarkersRef.current.push(new maplibregl.Marker({ element, anchor: pin.title ? 'bottom' : 'center' }).setLngLat([...pin.position]).addTo(map));
      });
    };
    void updateMarkers();
    if (routeBounds) map.fitBounds(routeBounds, { padding: 40, duration: 700 });
  }, [isWeb, route, routeBounds, stepPins, routeColors, onPinSelect]);

  // ============================================================================
  // 2. 모바일 환경 (Android / iOS) - react-native-webview 브릿지
  // ============================================================================
  const webViewRef = useRef<any>(null);

  const [htmlSource] = useState(() => {
    if (isWeb) return '';
    return buildMapLibreHtml({
      styleUrl: mapStyleUrl, route, stepPins, routeColors, maskingCenter, interactive,
    });
  });
  const mobileMapLoadedRef = useRef(false);

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent?.data || '{}');
      if (data.type === 'PIN_SELECT' && data.data?.instruction) {
        onPinSelect?.(data.data.instruction);
      } else if (data.type === 'MAP_LOADED') {
        mobileMapLoadedRef.current = true;
        onMapLoaded?.();
        webViewRef.current?.postMessage(JSON.stringify({
          action: 'UPDATE_ROUTE', route: latestRouteRef.current, stepPins: latestPinsRef.current,
        }));
      }
    } catch {}
  };

  // 모바일 환경에서 테마 변경 시 웹뷰로 새 스타일 전달
  useEffect(() => {
    if (!isWeb && webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({ action: 'SET_STYLE', styleUrl: mapStyleUrl })
      );
    }
  }, [isWeb, mapStyleUrl]);

  useEffect(() => {
    if (!isWeb && mobileMapLoadedRef.current && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ action: 'UPDATE_ROUTE', route, stepPins }));
    }
  }, [isWeb, route, stepPins]);

  // ============================================================================
  // 3. 렌더링
  // ============================================================================
  const containerStyle = [
    styles.container,
    { width: width as any, height: height as any },
    style,
  ];

  if (isWeb) {
    return (
      <View style={containerStyle}>
        <div
          ref={webContainerRef}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlSource }}
        style={styles.webView}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        onMessage={handleWebViewMessage}
        originWhitelist={['*']}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E8F1EC',
    borderWidth: 1,
    borderColor: '#D1E3D9',
  },
  webView: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});
