/**
 * [편안하개 - PetWalk]
 * 모바일 산책 설정 화면 (Screen-03, UX_COMPACT_RULES Rule 11 스크롤 배제 준수)
 *
 * 1. 상단: 컴팩트 타이틀 & 브리핑
 * 2. 중단: [시간·노면 설정] vs [상세 요청·요약] 2구 세그먼트
 * 3. 하단: Thumb Zone 원터치 AI 탐색 버튼 (Rule 3)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAppTheme } from '../../theme/themeManager';
import { AppIcon } from '../common/AppIcon';
import { DogProfile } from '../../types/dogProfile';
import { PILOT_PARKS, getPilotParkById } from '../../types/pilotParks';
import {
  EnvironmentId,
  WALK_ENVIRONMENTS,
  WalkPreferences,
  formatDurationLabel,
} from '../../types/walkSettings';
import { WalkDurationSlider } from './WalkDurationSlider';
import { WalkPreferenceChips } from './WalkPreferenceChips';
import { WalkVoiceInputSection } from './WalkVoiceInputSection';
import { WalkConditionsSummary } from './WalkConditionsSummary';

export interface WalkSettingsViewProps {
  dog: DogProfile;
  initialPreferences?: WalkPreferences;
  onBack: () => void;
  onFindRoute: (preferences: WalkPreferences) => void;
}

type PlannerSubTab = 'basic' | 'custom';

export const WalkSettingsView: React.FC<WalkSettingsViewProps> = ({
  dog,
  initialPreferences,
  onBack,
  onFindRoute,
}) => {
  const { colors } = useAppTheme();
  const [subTab, setSubTab] = useState<PlannerSubTab>('basic');
  const [pilotParkId, setPilotParkId] = useState<string>(
    initialPreferences?.pilotParkId ?? 'yurim'
  );
  const [duration, setDuration] = useState<number | null>(
    initialPreferences?.durationMinutes ?? 30
  );
  const [isFreeWalk, setIsFreeWalk] = useState<boolean>(
    initialPreferences?.isFreeWalk ?? false
  );
  const [environments, setEnvironments] = useState<EnvironmentId[]>(
    initialPreferences?.environments ?? ['soft', 'shade', 'stairs']
  );
  const [requestText, setRequestText] = useState(
    initialPreferences?.requestText ?? ''
  );

  const handleToggleEnvironment = (id: EnvironmentId) => {
    setEnvironments((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const currentPark = getPilotParkById(pilotParkId);

  const handleSubmit = () => {
    onFindRoute({
      durationMinutes: isFreeWalk ? null : duration,
      environments,
      requestText,
      isFreeWalk,
      pilotParkId,
    });
  };

  const selectedLabels: string[] = [
    dog.name,
    currentPark.badgeLabel,
    formatDurationLabel(duration, isFreeWalk),
    ...WALK_ENVIRONMENTS.filter((opt) => environments.includes(opt.id)).map((opt) => opt.label),
    ...(requestText.trim() ? ['직접 입력'] : []),
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={onBack} style={styles.backButton}>
          <AppIcon name="back" size={22} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textMain }]}>AI 산책 플래너</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.contentWrap}>
        {/* 상단 4대 파일럿 거점 공원 원터치 선택 칩 */}
        <View style={styles.parkSection}>
          <View style={styles.parkTitleRow}>
            <Text style={[styles.parkSectionTitle, { color: colors.textMuted }]}>
              대전·세종 파일럿 실증 거점
            </Text>
            <Text style={[styles.parkTargetNote, { color: colors.primaryDark }]}>
              {currentPark.name}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.parkScrollRow}
          >
            {PILOT_PARKS.map((park) => {
              const isSelected = park.id === pilotParkId;
              return (
                <TouchableOpacity
                  key={park.id}
                  activeOpacity={0.8}
                  onPress={() => setPilotParkId(park.id)}
                  style={[
                    styles.parkChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.parkChipText,
                      {
                        color: isSelected ? colors.textWhite : colors.textMain,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {park.badgeLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 상단 컴팩트 타이틀 & 브리핑 */}
        <View style={[styles.briefingBar, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <AppIcon name="sparkle" size={16} color={colors.primaryDark} />
          <Text style={[styles.briefingText, { color: colors.primaryDark }]} numberOfLines={1}>
            {currentPark.shortName} 산책로에 맞춘 {dog.name}의 안심 길을 찾아요.
          </Text>
        </View>

        {/* 2구 컴팩트 세그먼트 (스크롤 배제) */}
        <View style={[styles.segmentContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSubTab('basic')}
            style={[
              styles.segmentBtn,
              subTab === 'basic' && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
            ]}
          >
            <Text style={[styles.segmentText, { color: subTab === 'basic' ? colors.primaryDark : colors.textMuted }, subTab === 'basic' && styles.segmentTextActive]}>
              ⏱️ 시간 & 노면 환경
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSubTab('custom')}
            style={[
              styles.segmentBtn,
              subTab === 'custom' && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
            ]}
          >
            <Text style={[styles.segmentText, { color: subTab === 'custom' ? colors.primaryDark : colors.textMuted }, subTab === 'custom' && styles.segmentTextActive]}>
              🎙️ 상세 요청 & 요약
            </Text>
          </TouchableOpacity>
        </View>

        {/* 탭 콘텐츠 영역 (단일 뷰포트) */}
        <View style={styles.tabBody}>
          {subTab === 'basic' && (
            <View style={styles.sectionWrap}>
              <WalkDurationSlider
                duration={duration}
                isFreeWalk={isFreeWalk}
                onChangeDuration={setDuration}
                onChangeFreeWalk={setIsFreeWalk}
              />
              <View style={{ height: 8 }} />
              <WalkPreferenceChips
                environments={environments}
                onToggleEnvironment={handleToggleEnvironment}
              />
            </View>
          )}

          {subTab === 'custom' && (
            <View style={styles.sectionWrap}>
              <WalkVoiceInputSection
                dogName={dog.name}
                requestText={requestText}
                onChangeText={setRequestText}
              />
              <View style={{ height: 8 }} />
              <WalkConditionsSummary labels={selectedLabels} />
            </View>
          )}
        </View>
      </View>

      {/* 하단 고정 Thumb Zone 탐색 버튼 */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleSubmit}
          style={[styles.submitButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        >
          <View style={styles.submitButtonContent}>
            <AppIcon name="sparkle" size={18} color={colors.textWhite} />
            <Text style={[styles.submitButtonText, { color: colors.textWhite }]}>
              AI 안심 코스 찾아보기
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  headerPlaceholder: { width: 32 },
  contentWrap: { flex: 1, padding: 16, justifyContent: 'space-between' },
  parkSection: { marginBottom: 10 },
  parkTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  parkSectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: -0.2 },
  parkTargetNote: { fontSize: 11, fontWeight: '700' },
  parkScrollRow: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  parkChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  parkChipText: { fontSize: 12 },
  briefingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 10,
  },
  briefingText: { fontSize: 12, fontWeight: '600', flex: 1 },
  segmentContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentText: { fontSize: 12, fontWeight: '600' },
  segmentTextActive: { fontWeight: '800' },
  tabBody: { flex: 1, justifyContent: 'center' },
  sectionWrap: { width: '100%' },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  submitButton: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitButtonText: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
});
