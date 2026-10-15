/**
 * [편안하개 - PetWalk]
 * MapLibre 기반 모바일 코스 프리뷰 지도 뷰 (Phase 3, US-C1)
 *
 * 3색 Polyline 벡터 경로, 발자국 마커, 스텝 핀, 범례를 단일 벡터 지도에 표시합니다.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { TOKENS } from '../../theme/tokens';
import { LonLat, RouteFeatureCollection, RouteStepPin, RouteSegmentFeature } from '../../types/route';
import { buildCourseSummary } from '../../services/routeGeometry';
import { CourseSummaryCard } from './CourseSummaryCard';
import { RouteMapLegend } from './RouteMapLegend';
import { MapLibreMapView } from './MapLibreMapView';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_WIDTH = Math.min(SCREEN_WIDTH - 32, 380);
const MAP_HEIGHT = Math.max(220, Math.min(Math.round(SCREEN_HEIGHT * 0.32), 270));

export interface RouteMapViewProps {
  readonly route: RouteFeatureCollection;
  readonly stepPins: readonly RouteStepPin[];
  readonly speedKmH: number;
  readonly onStart?: () => void;
  readonly onPinSelect?: (instruction: string) => void;
  /** 단독 뷰일 때만 요약 카드를 표시합니다. */
  readonly showSummaryCard?: boolean;
}

export const RouteMapView: React.FC<RouteMapViewProps> = ({
  route,
  stepPins,
  speedKmH,
  onStart,
  onPinSelect,
  showSummaryCard = false,
}) => {
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  const allCoords = useMemo<LonLat[]>(
    () => route.features.flatMap((f: RouteSegmentFeature) => [...f.geometry.coordinates]),
    [route],
  );
  const summary = useMemo(() => buildCourseSummary(route, speedKmH), [route, speedKmH]);

  if (allCoords.length === 0) return null;

  const selectedPin = stepPins.find((pin) => pin.id === selectedPinId);

  return (
    <View style={styles.container}>
      <View style={styles.mapCanvas}>
        <MapLibreMapView
          route={route}
          stepPins={stepPins}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          onPinSelect={(instruction) => {
            const pin = stepPins.find((item) => item.instruction === instruction);
            setSelectedPinId(pin?.id ?? null);
            onPinSelect?.(instruction);
          }}
        />
        <View pointerEvents="none" style={styles.legendOverlay}>
          <RouteMapLegend />
        </View>
        {selectedPin && (
          <View style={styles.briefingBanner}>
            <Text style={styles.briefingText}>🔊 {selectedPin.instruction}</Text>
          </View>
        )}
      </View>

      {showSummaryCard && (
        <View style={styles.summaryWrapper}>
          <CourseSummaryCard summary={summary} onStart={onStart} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'column', alignItems: 'center' },
  mapCanvas: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    borderRadius: TOKENS.borderRadius.card,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
  },
  legendOverlay: { position: 'absolute', left: 8, bottom: 8, zIndex: 2 },
  briefingBanner: {
    position: 'absolute', bottom: 10, left: 10, right: 10,
    backgroundColor: TOKENS.colors.textMain, borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 12, zIndex: 3,
  },
  briefingText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  summaryWrapper: { marginTop: 12, width: MAP_WIDTH },
});
