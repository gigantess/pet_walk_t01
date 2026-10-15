/**
 * [편안하개 - PetWalk]
 * 모바일 코스 프리뷰 지도 뷰 (Phase 3, US-C1)
 *
 * 3색 Polyline 벡터 경로, 발자국 마커, 스텝 핀, 범례
 * [🗺️ 실제 OSM 지도 / 🧭 안심 코스 뷰] 듀얼 모드 지원
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, Image, TouchableOpacity, Platform } from 'react-native';
import NativeSvg, { Polyline as NativePolyline, Circle as NativeCircle, G as NativeG, Text as NativeSvgText } from 'react-native-svg';
import { TOKENS } from '../../theme/tokens';

const isWeb = Platform.OS === 'web';
const cleanWebProps = ({ accessible, style, ...props }: any) => {
  const flat = Array.isArray(style) ? StyleSheet.flatten(style) : style;
  return flat ? { style: flat, ...props } : props;
};

const Svg: React.ComponentType<any> = isWeb ? (props: any) => <svg {...cleanWebProps(props)} /> : NativeSvg;
const Polyline: React.ComponentType<any> = isWeb ? (props: any) => <polyline {...cleanWebProps(props)} /> : NativePolyline;
const Circle: React.ComponentType<any> = isWeb ? (props: any) => <circle {...cleanWebProps(props)} /> : NativeCircle;
const G: React.ComponentType<any> = isWeb ? (props: any) => <g {...cleanWebProps(props)} /> : NativeG;
const SvgText: React.ComponentType<any> = isWeb ? (props: any) => <text {...cleanWebProps(props)} /> : NativeSvgText;
import { LonLat, RouteFeatureCollection, RouteStepPin, RouteSegmentFeature } from '../../types/route';
import { buildCourseSummary } from '../../services/routeGeometry';
import { calculateOsmTiles } from '../../services/osmTileService';
import { CourseSummaryCard } from './CourseSummaryCard';
import { RealOsmWebView } from './RealOsmWebView';
import { RouteMapLegend, SEGMENT_COLORS } from './RouteMapLegend';
import { AppIcon } from '../common/AppIcon';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_WIDTH = Math.min(SCREEN_WIDTH - 32, 380);
// 화면 높이에 따라 220~270px 범위로 지도 높이를 최적화하여 상/하단 카드 잘림 방지
const MAP_HEIGHT = Math.max(220, Math.min(Math.round(SCREEN_HEIGHT * 0.32), 270));

function getPinColor(kind: RouteStepPin['kind']): string {
  if (kind === 'caution') return TOKENS.colors.routeCaution;
  if (kind === 'safe') return TOKENS.colors.routeSafe;
  return TOKENS.colors.routeNormal;
}

function getPinIcon(kind: RouteStepPin['kind']): string {
  if (kind === 'caution') return '!';
  if (kind === 'safe') return '🌿';
  return '↱';
}

export interface RouteMapViewProps {
  readonly route: RouteFeatureCollection;
  readonly stepPins: readonly RouteStepPin[];
  readonly speedKmH: number;
  readonly onStart?: () => void;
  readonly onPinSelect?: (instruction: string) => void;
  /** 단독 뷰일 때만 요약 카드를 표시 (CourseRecommendationView 등 상위에서 별도 카드를 제공할 때는 false) */
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
  const [mapMode, setMapMode] = useState<'course' | 'real_osm'>('course');
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  const allCoords = useMemo<LonLat[]>(
    () => route.features.flatMap((f: RouteSegmentFeature) => [...f.geometry.coordinates]),
    [route],
  );
  const summary = useMemo(() => buildCourseSummary(route, speedKmH), [route, speedKmH]);

  const project = useMemo(() => {
    if (allCoords.length === 0) return () => ({ x: 0, y: 0 });
    const lons = allCoords.map((c) => c[0]), lats = allCoords.map((c) => c[1]);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);

    const centerLon = (minLon + maxLon) / 2;
    const centerLat = (minLat + maxLat) / 2;
    const cosLat = Math.cos((centerLat * Math.PI) / 180);

    const padding = 26;
    const innerW = MAP_WIDTH - padding * 2;
    const innerH = MAP_HEIGHT - padding * 2;

    // 위경도 종횡비(Mercator cosLat)를 반영하여 왜곡 없는 1:1 축척 산출
    const lonDistEquiv = Math.max((maxLon - minLon) * cosLat, 1e-7);
    const latDistEquiv = Math.max(maxLat - minLat, 1e-7);
    const scale = Math.min(innerW / lonDistEquiv, innerH / latDistEquiv);

    // 캔버스 정중앙에 코스 중심점을 정확하게 일치시킴
    const centerX = MAP_WIDTH / 2;
    const centerY = MAP_HEIGHT / 2;

    return ([lon, lat]: LonLat) => ({
      x: centerX + (lon - centerLon) * cosLat * scale,
      y: centerY - (lat - centerLat) * scale,
    });
  }, [allCoords]);

  if (allCoords.length === 0) return null;

  const startPt = project(allCoords[0]);
  const selectedPin = stepPins.find((p) => p.id === selectedPinId);
  const tiles = useMemo(() => calculateOsmTiles(allCoords, project, 16, 'osm', 1), [allCoords, project]);

  return (
    <View style={styles.container}>
      {/* 듀얼 맵 모드 스위치 바 */}
      <View style={styles.modeSwitchBar}>
        <TouchableOpacity
          style={[styles.modeTab, mapMode === 'course' && styles.modeTabActive]}
          onPress={() => setMapMode('course')}
        >
          <View style={styles.modeTabContent}>
            <AppIcon name="map" size={15} color={mapMode === 'course' ? TOKENS.colors.primaryDark : TOKENS.colors.textMuted} />
            <Text style={[styles.modeTabText, mapMode === 'course' && styles.modeTabTextActive]}>안심 코스 뷰</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, mapMode === 'real_osm' && styles.modeTabActive]}
          onPress={() => setMapMode('real_osm')}
        >
          <View style={styles.modeTabContent}>
            <AppIcon name="map" size={15} color={mapMode === 'real_osm' ? TOKENS.colors.primaryDark : TOKENS.colors.textMuted} />
            <Text style={[styles.modeTabText, mapMode === 'real_osm' && styles.modeTabTextActive]}>실제 OSM 지도</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 지도 영역 */}
      {mapMode === 'real_osm' ? (
        <RealOsmWebView coords={allCoords} width={MAP_WIDTH} height={MAP_HEIGHT} />
      ) : (
        <View style={styles.mapCanvas}>
          {/* 깨끗한 OSM 실제 타일 배경 */}
          <View style={StyleSheet.absoluteFill}>
            {tiles.map((tile) => (
              <Image
                key={tile.key}
                source={{ uri: tile.url }}
                style={[styles.osmTile, { left: tile.x, top: tile.y, width: tile.width, height: tile.height }]}
                resizeMode="cover"
              />
            ))}
          </View>

          <Svg width={MAP_WIDTH} height={MAP_HEIGHT} style={[StyleSheet.absoluteFill, { zIndex: 2 }]}>
            {route.features.map((feature: RouteSegmentFeature) => {
              const color = SEGMENT_COLORS[feature.properties.segmentType];
              const segKey = `seg_${feature.properties.segmentType}_${feature.geometry.coordinates[0].join('_')}`;
              const pointsStr = feature.geometry.coordinates
                .map((c) => `${project(c).x.toFixed(1)},${project(c).y.toFixed(1)}`).join(' ');
              return (
                <G key={segKey}>
                  <Polyline points={pointsStr} fill="none" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
                  <Polyline points={pointsStr} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                </G>
              );
            })}

            {stepPins.map((pin) => {
              const pt = project(pin.position);
              const color = getPinColor(pin.kind);
              const icon = getPinIcon(pin.kind);
              const isSelected = pin.id === selectedPinId;
              return (
                <G key={pin.id}>
                  <Circle cx={pt.x} cy={pt.y} r={isSelected ? 14 : 11} fill={color} stroke="#FFFFFF" strokeWidth="2.5" />
                  <SvgText x={pt.x} y={pt.y + 4} textAnchor="middle" fontSize={isSelected ? '13' : '11'} fontWeight="bold" fill="#FFFFFF">
                    {icon}
                  </SvgText>
                </G>
              );
            })}

            <G>
              <Circle cx={startPt.x} cy={startPt.y} r={18} fill={TOKENS.colors.primary} opacity={0.25} />
              <Circle cx={startPt.x} cy={startPt.y} r={13} fill={TOKENS.colors.primary} stroke="#FFFFFF" strokeWidth="2.5" />
              <SvgText x={startPt.x} y={startPt.y - 18} textAnchor="middle" fontSize="10" fontWeight="bold" fill={TOKENS.colors.primaryDark}>
                출발/도착
              </SvgText>
            </G>
          </Svg>

          {stepPins.map((pin) => {
            const pt = project(pin.position);
            return (
              <Pressable
                key={`touch_${pin.id}`}
                style={[styles.pinTouchTarget, { left: pt.x - 16, top: pt.y - 16 }]}
                onPress={() => { setSelectedPinId(pin.id); onPinSelect?.(pin.instruction); }}
                accessibilityRole="button"
                accessibilityLabel={pin.instruction}
              />
            );
          })}

          <RouteMapLegend />

          {selectedPin && (
            <View style={styles.briefingBanner}>
              <Text style={styles.briefingText}>🔊 {selectedPin.instruction}</Text>
            </View>
          )}
        </View>
      )}

      {showSummaryCard && (
        <View style={styles.summaryWrapper}>
          <CourseSummaryCard summary={summary} onStart={onStart} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'column' },
  modeSwitchBar: {
    flexDirection: 'row',
    backgroundColor: '#E6EFEA',
    borderRadius: 12,
    padding: 3,
    marginBottom: 8,
    alignSelf: 'center',
    width: MAP_WIDTH,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.colors.textMuted,
  },
  modeTabTextActive: {
    color: TOKENS.colors.primaryDark,
  },
  modeTabContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  mapCanvas: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    borderRadius: TOKENS.borderRadius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    backgroundColor: TOKENS.colors.mapGround,
    position: 'relative',
    alignSelf: 'center',
  },
  osmTile: { position: 'absolute', opacity: 0.95 },
  pinTouchTarget: { position: 'absolute', width: 32, height: 32, borderRadius: 16, zIndex: 10 },
  briefingBanner: {
    position: 'absolute', bottom: 10, left: 10, right: 10,
    backgroundColor: TOKENS.colors.textMain, borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  briefingText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  summaryWrapper: { marginTop: 12 },
});
