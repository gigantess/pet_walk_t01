/**
 * [편안하개 - PetWalk]
 * 모바일 산책 설정 화면 (Screen-03, US-A1, US-A3, #38)
 *
 * 15분 단위 세분화 슬라이더/자유 산책, 6대 선호 환경 다중 선택, 자연어/음성 입력, 산책 코스 탐색
 * SonarLint 유지보수성을 위해 하위 컴포넌트로 분리된 컨테이너 구조를 취한다.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { TOKENS } from '../../theme/tokens';
import { AppIcon } from '../common/AppIcon';
import { DogProfile } from '../../types/dogProfile';
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

export const WalkSettingsView: React.FC<WalkSettingsViewProps> = ({
  dog,
  initialPreferences,
  onBack,
  onFindRoute,
}) => {
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

  const handleSubmit = () => {
    onFindRoute({
      durationMinutes: isFreeWalk ? null : duration,
      environments,
      requestText,
      isFreeWalk,
    });
  };

  // 선택된 조건 레이블 배열
  const selectedLabels: string[] = [
    dog.name,
    formatDurationLabel(duration, isFreeWalk),
    ...WALK_ENVIRONMENTS.filter((opt) => environments.includes(opt.id)).map(
      (opt) => opt.label
    ),
    ...(requestText.trim() ? ['직접 입력한 요청'] : []),
  ];

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onBack}
          style={styles.backButton}
        >
          <AppIcon name="back" size={24} color={TOKENS.colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>산책 설정</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 타이틀 안내 */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>{dog.name}와 어떤 산책을 할까요?</Text>
          <Text style={styles.subTitle}>
            원하는 산책 조건을 알려주면 AI가 {dog.name}에게{'\n'}맞는 안심 길을 찾아볼게요.
          </Text>
        </View>

        {/* AI 안내 배너 */}
        <View style={styles.aiBanner}>
          <View style={styles.aiBannerHeader}>
            <AppIcon name="sparkle" size={18} color={TOKENS.colors.primaryDark} />
            <Text style={styles.aiBannerTitle}>오늘의 산책, AI에게 맡겨보세요</Text>
          </View>
          <Text style={styles.aiBannerBody}>
            {dog.name}의 산책 시간과 원하는 환경을 알려주면{'\n'}
            관절 안심 지수와 온도를 분석해 코스를 찾아드릴게요.
          </Text>
        </View>

        {/* 섹션 1: 얼마나 걸을까요? (15분 단위 세분화 슬라이더 & 자유 산책) */}
        <WalkDurationSlider
          duration={duration}
          isFreeWalk={isFreeWalk}
          onChangeDuration={setDuration}
          onChangeFreeWalk={setIsFreeWalk}
        />

        {/* 섹션 2: 어떤 길이 좋을까요? (6대 환경 선호 그리드) */}
        <WalkPreferenceChips
          environments={environments}
          onToggleEnvironment={handleToggleEnvironment}
        />

        {/* 섹션 3: 직접 말해도 좋아요 (자연어 및 음성 입력) */}
        <WalkVoiceInputSection
          dogName={dog.name}
          requestText={requestText}
          onChangeText={setRequestText}
        />

        {/* 섹션 4: 현재 산책 조건 태그 요약 */}
        <WalkConditionsSummary labels={selectedLabels} />
      </ScrollView>

      {/* 하단 고정 버튼 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleSubmit}
          style={styles.submitButton}
        >
          <View style={styles.submitButtonContent}>
            <AppIcon name="sparkle" size={18} color={TOKENS.colors.textWhite} />
            <Text style={styles.submitButtonText}>AI 산책 코스 찾아보기</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.background,
  },
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
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TOKENS.colors.textMain,
    letterSpacing: -0.3,
  },
  headerPlaceholder: { width: 36 },
  scrollContent: { padding: 20, paddingBottom: 110 },
  titleSection: { marginBottom: 20, marginTop: 6 },
  mainTitle: { fontSize: 22, fontWeight: '800', color: TOKENS.colors.textMain, letterSpacing: -0.6, marginBottom: 6 },
  subTitle: { fontSize: 13, color: TOKENS.colors.textMuted, lineHeight: 18 },
  aiBanner: {
    backgroundColor: TOKENS.colors.primaryLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: TOKENS.colors.primary,
  },
  aiBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  aiBannerTitle: { fontSize: 13, fontWeight: '700', color: TOKENS.colors.primaryDark },
  aiBannerBody: { fontSize: 12, color: TOKENS.colors.textMuted, lineHeight: 17 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: TOKENS.colors.surface,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.border,
  },
  submitButton: {
    backgroundColor: TOKENS.colors.primaryDark,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitButtonText: { color: TOKENS.colors.textWhite, fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
});
