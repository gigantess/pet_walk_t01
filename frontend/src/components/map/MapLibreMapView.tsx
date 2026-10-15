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
import { View, StyleSheet, Platform, StyleProp, ViewStyle, Dimensions } from 'react-native';
import WebView from 'react-native-webview';
import { RouteFeatureCollection, RouteStepPin, LonLat } from '../../types/route';
import { useMapThemeStyle } from '../../constants/mapStyles';
import { buildMapLibreHtml } from './maplibreWebTemplate';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

  // 모든 좌표 Bounding Box 계산
  const routeBounds = useMemo<[[number, number], [number, number]] | null>(() => {
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    if (!route || !route.features) return null;
    route.features.forEach((f) => {
      if (f.geometry?.coordinates) {
        f.geometry.coordinates.forEach(([lon, lat]) => {
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        });
      }
    });
    if (minLon === Infinity) return null;
    return [[minLon, minLat], [maxLon, maxLat]];
  }, [route]);

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;

    let mapInstance: any = null;
    let isDisposed = false;

    async function initWebMap() {
      try {
        const maplibregl = await import('maplibre-gl');
        if (isDisposed || !webContainerRef.current) return;

        const defaultCenter: [number, number] = routeBounds
          ? [(routeBounds[0][0] + routeBounds[1][0]) / 2, (routeBounds[0][1] + routeBounds[1][1]) / 2]
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

          // 1. 산책 경로 GeoJSON 소스 등록
          mapInstance.addSource('route-source', {
            type: 'geojson',
            data: route,
          });

          // 2. 경로 외곽 테두리 (Casing)
          mapInstance.addLayer({
            id: 'route-casing',
            type: 'line',
            source: 'route-source',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': routeColors.casing,
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
                'safe', routeColors.safe,
                'caution', routeColors.caution,
                routeColors.normal,
              ],
              'line-width': 5,
            },
          });

          // 4. 카메라 Bounding Box 피팅
          if (routeBounds) {
            mapInstance.fitBounds(routeBounds, { padding: 40, duration: 600 });
          }

          onMapLoaded?.();
        });
      } catch (err) {
        // WebGL 미지원 또는 SSR 테스트 환경 에러 방어
      }
    }

    void initWebMap();

    return () => {
      isDisposed = true;
      if (webMapInstanceRef.current) {
        try {
          webMapInstanceRef.current.remove();
        } catch (_) {}
        webMapInstanceRef.current = null;
      }
    };
  }, [isWeb, mapStyleUrl]);

  // ============================================================================
  // 2. 모바일 환경 (Android / iOS) - react-native-webview 브릿지
  // ============================================================================
  const webViewRef = useRef<any>(null);

  const htmlSource = useMemo(() => {
    if (isWeb) return '';
    return buildMapLibreHtml({
      styleUrl: mapStyleUrl,
      route,
      stepPins,
      routeColors,
      maskingCenter,
      interactive,
    });
  }, [isWeb, mapStyleUrl, route, stepPins, routeColors, maskingCenter, interactive]);

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent?.data || '{}');
      if (data.type === 'PIN_SELECT' && data.data?.instruction) {
        onPinSelect?.(data.data.instruction);
      } else if (data.type === 'MAP_LOADED') {
        onMapLoaded?.();
      }
    } catch (_) {}
  };

  // 모바일 환경에서 테마 변경 시 웹뷰로 새 스타일 전달
  useEffect(() => {
    if (!isWeb && webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({ action: 'SET_STYLE', styleUrl: mapStyleUrl })
      );
    }
  }, [isWeb, mapStyleUrl]);

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
