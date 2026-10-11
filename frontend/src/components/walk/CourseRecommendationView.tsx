/**
 * [편안하개 - PetWalk]
 * 모바일 추천 산책 코스 화면 (Screen-04, US-B1, US-C1, US-29)
 *
 * 지도 프리뷰, 3대 안심 지표(경사/노면/그늘), 추천 사유 카드, 대체 코스 선택, 즐겨찾기 저장
 * 세부 UI는 CourseInfoCard / AlternativeCourseList / PlanSourceBadge 로 분리되어 있다.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { requestWalkPlan, RoutePlanResult } from '../../services/api';
import { createBookmark } from '../../services/bookmarkService';
import { SAMPLE_ROUTE, SAMPLE_STEP_PINS } from '../../services/sampleRoute';
import { TOKENS } from '../../theme/tokens';
import { CoursePlan } from '../../types/bookmark';
import { DogProfile } from '../../types/dogProfile';
import { DEFAULT_RECOMMENDED_COURSES, RecommendedCourse, WalkPreferences } from '../../types/walkSettings';
import { RouteMapView } from '../map/RouteMapView';
import { RouteReasonCard } from '../map/RouteReasonCard';
import { AlternativeCourseList } from './AlternativeCourseList';
import { CourseInfoCard } from './CourseInfoCard';
import { PlanSourceBadge } from './PlanSourceBadge';

export interface CourseRecommendationViewProps {
  dog: DogProfile;
  preferences?: WalkPreferences;
  onBack: () => void;
  onStartWalk: (course: RecommendedCourse, plan?: CoursePlan) => void;
  onPinSelect?: (instruction: string) => void;
}

/** 사용자 선택 조건을 상단 태그 칩 문구로 변환한다. */
function buildConditionLabels(dog: DogProfile, preferences?: WalkPreferences): string[] {
  const minutes = preferences?.durationMinutes;
  let durationLabel = '30분';
  if (minutes) durationLabel = minutes === 60 ? '1시간' : `${minutes}분`;
  return [dog.name, durationLabel, '폭신한 길', '그늘이 많은 길', '계단 피하기'];
}

export const CourseRecommendationView: React.FC<CourseRecommendationViewProps> = ({
  dog,
  preferences,
  onBack,
  onStartWalk,
  onPinSelect,
}) => {
  const [courses, setCourses] = useState<readonly RecommendedCourse[]>(DEFAULT_RECOMMENDED_COURSES);
  const [selectedCourseIndex, setSelectedCourseIndex] = useState(0);
  const [planResult, setPlanResult] = useState<RoutePlanResult | null>(null);

  useEffect(() => {
    let isMounted = true;
    void requestWalkPlan(dog, preferences).then((res) => {
      if (!isMounted) return;
      setPlanResult(res);
      if (res.courses.length > 0) setCourses(res.courses);
    });
    return () => { isMounted = false; };
  }, [dog, preferences]);

  const currentCourse = courses[selectedCourseIndex] ?? courses[0];
  const activeRoute = planResult?.route ?? SAMPLE_ROUTE;
  const activePins = planResult?.stepPins ?? SAMPLE_STEP_PINS;
  const plan: CoursePlan = useMemo(() => ({ route: activeRoute, stepPins: activePins }), [activeRoute, activePins]);
  const bookmarkCandidate = useMemo(
    () => (currentCourse ? createBookmark(currentCourse, plan, dog.name) : null),
    [currentCourse, plan, dog.name],
  );
  const conditionLabels = useMemo(() => buildConditionLabels(dog, preferences), [dog, preferences]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>추천 산책 코스</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <PlanSourceBadge isLive={Boolean(planResult?.isLiveServer)} />

        <View style={styles.titleSection}>
          <View style={styles.sparkleBadge}>
            <Text style={styles.sparkleIcon}>✨</Text>
          </View>
          <Text style={styles.mainTitle}>
            {dog.name}에게 맞는 산책 코스를{'\n'}찾았어요.
          </Text>
          <Text style={styles.subTitle}>선택한 조건을 반영해 관절과 발바닥이 편안한 순환 코스예요.</Text>
        </View>

        <View style={styles.tagWrap}>
          {conditionLabels.map((lbl) => (
            <View key={lbl} style={styles.tagChip}>
              <Text style={styles.tagText}>{lbl}</Text>
            </View>
          ))}
        </View>

        <View style={styles.mapWrapper}>
          <RouteMapView
            route={activeRoute}
            stepPins={activePins}
            speedKmH={dog.speedKmH}
            onStart={() => onStartWalk(currentCourse, plan)}
            onPinSelect={onPinSelect}
          />
        </View>

        <CourseInfoCard course={currentCourse} rank={selectedCourseIndex + 1} bookmark={bookmarkCandidate} />

        <RouteReasonCard
          reasonText={currentCourse.reason}
          maxSlopePercent={currentCourse.maxSlopePercent}
          softSurfacePercent={currentCourse.softSurfacePercent}
          shadePercent={currentCourse.shadePercent}
        />

        <AlternativeCourseList courses={courses} selectedIndex={selectedCourseIndex} onSelect={setSelectedCourseIndex} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity activeOpacity={0.88} onPress={() => onStartWalk(currentCourse, plan)} style={styles.startButton}>
          <Text style={styles.startButtonText}>이 코스로 산책 시작하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TOKENS.colors.background },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.border,
    backgroundColor: TOKENS.colors.surface,
  },
  backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 26, color: TOKENS.colors.textMain, fontWeight: '300' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: TOKENS.colors.textMain, letterSpacing: -0.3 },
  headerPlaceholder: { width: 36 },
  scrollContent: { padding: 20, paddingBottom: 110 },
  titleSection: { marginBottom: 12, marginTop: 6 },
  sparkleBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sparkleIcon: { fontSize: 16 },
  mainTitle: { fontSize: 22, fontWeight: '800', color: TOKENS.colors.textMain, letterSpacing: -0.5, marginBottom: 6, lineHeight: 28 },
  subTitle: { fontSize: 13, color: TOKENS.colors.textMuted, lineHeight: 18 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  tagChip: { backgroundColor: TOKENS.colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  tagText: { fontSize: 11, fontWeight: '600', color: TOKENS.colors.primaryDark },
  mapWrapper: { marginBottom: 16, borderRadius: TOKENS.borderRadius.card, overflow: 'hidden' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: TOKENS.colors.surface,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.border,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 6,
  },
  startButton: {
    backgroundColor: TOKENS.colors.primary,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TOKENS.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  startButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
});
