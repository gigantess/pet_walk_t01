/**
 * [편안하개 - PetWalk]
 * 모바일 홈 탭 화면 (Screen-01, UX_COMPACT_RULES Rule 11 스크롤 배제 준수)
 *
 * 1. 상단: 활성 반려견 퀵 프로필 & 관절 안심 케어 상태
 * 2. 중단: [지면온도 골든타임] vs [최근 산책 & AI 보정] 2구 컴팩트 세그먼트
 * 3. 하단: 한 손 조작 Thumb Zone (산책 시작 Primary + AI 플래너 Secondary)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../theme/themeManager';
import { DogProfile } from '../types/dogProfile';
import { GoldenTimeWidget } from '../components/home/GoldenTimeWidget';
import { RecentWalkCard } from '../components/home/RecentWalkCard';
import { FeedbackContextService, FeedbackSummaryPayload } from '../services/feedbackContext';
import { AppIcon } from '../components/common/AppIcon';
import { fetchHeatRiskForecast } from '../services/weatherApi';
import { HeatRiskResponse } from '../types/weather';

export interface HomeScreenProps {
  dog: DogProfile;
  feedbackSummary: FeedbackSummaryPayload | null;
  onPressProfile: () => void;
  onStartWalk: () => void;
  onOpenPlanner: () => void;
}

type HomeSubTab = 'golden_time' | 'recent_walk';

export const HomeScreen: React.FC<HomeScreenProps> = ({
  dog,
  feedbackSummary,
  onPressProfile,
  onStartWalk,
  onOpenPlanner,
}) => {
  const { colors } = useAppTheme();
  const [activeSubTab, setActiveSubTab] = useState<HomeSubTab>('golden_time');
  const [weather, setWeather] = useState<HeatRiskResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    void fetchHeatRiskForecast(37.544, 127.038).then((res) => {
      if (isMounted) setWeather(res);
    });
    return () => { isMounted = false; };
  }, []);

  return (
    <View style={styles.container}>
      {/* 1. 상단: 반려견 프로필 퀵 바 (터치 시 강아지 변경) */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPressProfile}
        style={[styles.profileBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.avatarWrap}>
          <View style={[styles.avatarBox, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <AppIcon name="pawOutline" size={24} color={colors.primaryDark} />
          </View>
          <View style={[styles.onlineDot, { backgroundColor: colors.primary }]} />
        </View>

        <View style={styles.profileInfo}>
          <View style={styles.dogNameRow}>
            <Text style={[styles.dogName, { color: colors.textMain }]}>{dog.name}</Text>
            <View style={[styles.careBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.careBadgeText, { color: colors.primaryDark }]}>
                {dog.jointCareLevel >= 2 ? '관절 집중 케어' : '관절 안심 케어'}
              </Text>
            </View>
            <Text style={[styles.changeLabel, { color: colors.textMuted }]}>변경 ▾</Text>
          </View>
          <Text style={[styles.dogMeta, { color: colors.textMuted }]}>
            {dog.breed} · {dog.ageYears}살 · 추천 속도 {dog.speedKmH}km/h
          </Text>
        </View>
      </TouchableOpacity>

      {/* 2. 중단: 2구 컴팩트 세그먼트 스위처 (스크롤 배제 핵심) */}
      <View style={[styles.segmentContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveSubTab('golden_time')}
          style={[
            styles.segmentBtn,
            activeSubTab === 'golden_time' && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
          ]}
        >
          <AppIcon name="sun" size={14} color={activeSubTab === 'golden_time' ? colors.primaryDark : colors.textMuted} />
          <Text
            style={[
              styles.segmentText,
              { color: activeSubTab === 'golden_time' ? colors.primaryDark : colors.textMuted },
              activeSubTab === 'golden_time' && styles.segmentTextActive,
            ]}
          >
            지면온도 골든타임
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveSubTab('recent_walk')}
          style={[
            styles.segmentBtn,
            activeSubTab === 'recent_walk' && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
          ]}
        >
          <AppIcon name="paw" size={14} color={activeSubTab === 'recent_walk' ? colors.primaryDark : colors.textMuted} />
          <Text
            style={[
              styles.segmentText,
              { color: activeSubTab === 'recent_walk' ? colors.primaryDark : colors.textMuted },
              activeSubTab === 'recent_walk' && styles.segmentTextActive,
            ]}
          >
            오늘 산책 현황
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. 서브탭 콘텐츠 영역 (고정 높이 컴팩트 뷰) */}
      <View style={styles.tabContentArea}>
        {activeSubTab === 'golden_time' && (
          <View style={styles.widgetWrapper}>
            <GoldenTimeWidget weather={weather} />
          </View>
        )}

        {activeSubTab === 'recent_walk' && (
          <View style={styles.widgetWrapper}>
            <RecentWalkCard
              title="오늘의 안심 산책"
              distanceKm={2.4}
              durationMinutes={38}
              safeRatioPercent={72}
              onPress={onStartWalk}
            />
            {feedbackSummary && (
              <View style={[styles.aiNoticeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.aiNoticeTitle, { color: colors.primaryDark }]}>
                  🤖 AI 맞춤 보정 브리핑
                </Text>
                <Text style={[styles.aiNoticeText, { color: colors.textMuted }]} numberOfLines={2}>
                  "{FeedbackContextService.generateBriefingNotice(feedbackSummary)}"
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* 4. 하단 Thumb Zone 액션 버튼 (Rule 3: 하단 40% 영역, 최소 48px 이상) */}
      <View style={styles.bottomActionZone}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onStartWalk}
          style={[styles.primaryWalkButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        >
          <View style={styles.btnContent}>
            <AppIcon name="paw" size={20} color={colors.textWhite} />
            <Text style={[styles.primaryButtonText, { color: colors.textWhite }]}>
              {dog.name}와 안심 산책 시작
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onOpenPlanner}
          style={[styles.secondaryPlannerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.btnContent}>
            <AppIcon name="sparkle" size={16} color={colors.primaryDark} />
            <Text style={[styles.secondaryButtonText, { color: colors.textMain }]}>
              AI 맞춤 코스 플래너 열기
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingBottom: 6 },
  profileBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 10, gap: 12 },
  avatarWrap: { position: 'relative' },
  avatarBox: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#FFFFFF' },
  profileInfo: { flex: 1 },
  dogNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dogName: { fontSize: 16, fontWeight: '800' },
  careBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  careBadgeText: { fontSize: 10, fontWeight: '700' },
  changeLabel: { fontSize: 11, marginLeft: 'auto' },
  dogMeta: { fontSize: 11, marginTop: 3 },
  segmentContainer: { flexDirection: 'row', padding: 4, borderRadius: 12, borderWidth: 1, marginBottom: 10, gap: 6 },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'transparent', gap: 5 },
  segmentText: { fontSize: 12, fontWeight: '600' },
  segmentTextActive: { fontWeight: '800' },
  tabContentArea: { flex: 1, justifyContent: 'center' },
  widgetWrapper: { width: '100%' },
  aiNoticeCard: { marginTop: 8, padding: 10, borderRadius: 12, borderWidth: 1 },
  aiNoticeTitle: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  aiNoticeText: { fontSize: 11, lineHeight: 15, fontStyle: 'italic' },
  bottomActionZone: { gap: 8, marginTop: 'auto', paddingTop: 8 },
  primaryWalkButton: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  secondaryPlannerButton: { height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryButtonText: { fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },
  secondaryButtonText: { fontSize: 13, fontWeight: '600' },
});
