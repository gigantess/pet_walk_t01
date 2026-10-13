/**
 * [편안하개 - PetWalk]
 * 모바일 추천 산책 코스 화면 (Screen-04, UX_COMPACT_RULES Rule 11 스크롤 배제 준수)
 *
 * 상단 45% 고정 지도 + 하단 55% 코스 선택/사유/한 손 조작 버튼(Thumb Zone)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { requestWalkPlan, RoutePlanResult } from '../../services/api';
import { createBookmark } from '../../services/bookmarkService';
import { generateAdaptiveCourses } from '../../services/courseAdaptivePlanner';
import { getCoursePlanById } from '../../services/sampleRoute';
import { useAppTheme } from '../../theme/themeManager';
import { AppIcon } from '../common/AppIcon';
import { CoursePlan } from '../../types/bookmark';
import { buildCourseSummary } from '../../services/routeGeometry';
import { DogProfile } from '../../types/dogProfile';
import { RecommendedCourse, WalkPreferences } from '../../types/walkSettings';
import { RouteMapView } from '../map/RouteMapView';
import { FeedbackSummaryPayload } from '../../services/feedbackContext';
import { PlanSourceBadge } from './PlanSourceBadge';
import { BookmarkToggleButton } from '../bookmark/BookmarkToggleButton';

export interface CourseRecommendationViewProps {
  dog: DogProfile;
  preferences?: WalkPreferences;
  feedback?: FeedbackSummaryPayload | null;
  onBack: () => void;
  onStartWalk: (course: RecommendedCourse, plan?: CoursePlan) => void;
  onPinSelect?: (instruction: string) => void;
}

export const CourseRecommendationView: React.FC<CourseRecommendationViewProps> = ({
  dog,
  preferences,
  feedback,
  onBack,
  onStartWalk,
  onPinSelect,
}) => {
  const { colors } = useAppTheme();
  const [courses, setCourses] = useState<readonly RecommendedCourse[]>(() =>
    generateAdaptiveCourses(dog, preferences, feedback)
  );
  const [selectedCourseIndex, setSelectedCourseIndex] = useState(0);
  const [planResult, setPlanResult] = useState<RoutePlanResult | null>(null);

  useEffect(() => {
    let isMounted = true;
    void requestWalkPlan(dog, preferences, feedback).then((res) => {
      if (!isMounted) return;
      setPlanResult(res);
      if (res.courses.length > 0) setCourses(res.courses);
    });
    return () => { isMounted = false; };
  }, [dog, preferences, feedback]);

  const currentCourse = courses[selectedCourseIndex] ?? courses[0];
  const candidatePlan = currentCourse?.id ? planResult?.coursePlans?.[currentCourse.id] : undefined;
  const activePlan = useMemo(() => {
    if (candidatePlan) return candidatePlan;
    if (planResult?.isLiveServer && selectedCourseIndex === 0) {
      return { route: planResult.route, stepPins: planResult.stepPins };
    }
    return getCoursePlanById(currentCourse?.id);
  }, [candidatePlan, currentCourse?.id, planResult, selectedCourseIndex]);

  const activeRoute = activePlan.route;
  const activePins = activePlan.stepPins;
  const plan: CoursePlan = useMemo(() => ({ route: activeRoute, stepPins: activePins }), [activeRoute, activePins]);
  const activeSummary = useMemo(
    () => buildCourseSummary(activeRoute, dog.speedKmH),
    [activeRoute, dog.speedKmH],
  );
  const bookmarkCandidate = useMemo(
    () => (currentCourse ? createBookmark(currentCourse, plan, dog.name) : null),
    [currentCourse, plan, dog.name],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 컴팩트 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={onBack} style={styles.backButton}>
          <AppIcon name="back" size={22} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textMain }]}>추천 안심 코스</Text>
        <PlanSourceBadge isLive={Boolean(planResult?.isLiveServer)} />
      </View>

      {/* 상단 42%: 실시간 경로 지도 프리뷰 (스크롤 배제 핵심) */}
      <View style={styles.mapSection}>
        <RouteMapView
          key={currentCourse.id}
          route={activeRoute}
          stepPins={activePins}
          speedKmH={dog.speedKmH}
          onStart={() => onStartWalk(currentCourse, plan)}
          onPinSelect={onPinSelect}
        />
      </View>

      {/* 하단 58%: 대체 코스 퀵 칩 + 핵심 수치 + 추천 사유 + Thumb Zone 액션 */}
      <View style={[styles.bottomCard, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {/* 가로 대체 코스 선택 칩 (스크롤 없는 3구 버튼) */}
        <View style={styles.courseChipRow}>
          {courses.slice(0, 3).map((c, idx) => {
            const isSelected = idx === selectedCourseIndex;
            return (
              <TouchableOpacity
                key={c.id}
                activeOpacity={0.8}
                onPress={() => setSelectedCourseIndex(idx)}
                style={[
                  styles.courseChip,
                  {
                    backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.courseChipText,
                    { color: isSelected ? colors.primaryDark : colors.textMuted },
                    isSelected && styles.courseChipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {idx === 0 ? '👑 추천 1' : `코스 ${idx + 1}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 선택 코스 요약 & 즐겨찾기 */}
        <View style={styles.courseSummaryRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.courseTitle, { color: colors.textMain }]}>{currentCourse.name}</Text>
            <Text style={[styles.courseMeta, { color: colors.textMuted }]}>
              {activeSummary.totalDistanceKm.toFixed(1)}km · 약 {activeSummary.estimatedMinutes}분 · 권장 {dog.speedKmH}km/h
            </Text>
          </View>
          <BookmarkToggleButton bookmark={bookmarkCandidate} />
        </View>

        {/* 3대 안심 지표 바 (노면/경사/그늘) */}
        <View style={[styles.metricsBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>폭신 노면</Text>
            <Text style={[styles.metricValue, { color: colors.primary }]}>{currentCourse.softRatio}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>최대 경사</Text>
            <Text style={[styles.metricValue, { color: colors.textMain }]}>{currentCourse.maxSlopePercent}%</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>그늘 비율</Text>
            <Text style={[styles.metricValue, { color: colors.textMain }]}>{currentCourse.shadePercent}%</Text>
          </View>
        </View>

        {/* 추천 사유 투명 공개 (Rule 1 & Rule 10 준수) */}
        <View style={styles.reasonBox}>
          <Text style={[styles.reasonText, { color: colors.primaryDark }]} numberOfLines={2}>
            💡 {currentCourse.reason}
          </Text>
        </View>

        {/* Thumb Zone 산책 시작 버튼 (Rule 3 준수: 높이 52px 이상) */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => onStartWalk(currentCourse, plan)}
          style={[styles.startButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        >
          <View style={styles.btnContent}>
            <AppIcon name="paw" size={20} color={colors.textWhite} />
            <Text style={[styles.startButtonText, { color: colors.textWhite }]}>
              이 코스로 안심 산책 시작
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, borderBottomWidth: 1 },
  backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },
  mapSection: { flex: 4, minHeight: 180 },
  bottomCard: { flex: 6, borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, justifyContent: 'space-between' },
  courseChipRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  courseChip: { flex: 1, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  courseChipText: { fontSize: 11, fontWeight: '600' },
  courseChipTextActive: { fontWeight: '800' },
  courseSummaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  courseTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  courseMeta: { fontSize: 12, marginTop: 2 },
  metricsBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 8, borderRadius: 12, borderWidth: 1, marginBottom: 6 },
  metricItem: { alignItems: 'center' },
  metricLabel: { fontSize: 10, marginBottom: 2 },
  metricValue: { fontSize: 13, fontWeight: '700' },
  metricDivider: { width: 1, height: 20, backgroundColor: 'rgba(0,0,0,0.08)' },
  reasonBox: { paddingHorizontal: 4, marginBottom: 8 },
  reasonText: { fontSize: 11, lineHeight: 16, fontStyle: 'italic' },
  startButton: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  startButtonText: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
});
