/**
 * [편안하개 - PetWalk]
 * 인터랙티브 온보딩 위저드 및 첫 산책 가이드 투어 (US-21)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TOKENS } from '../../theme/tokens';
import { GradientButton } from '../common/GradientButton';
import { ONBOARDING_SLIDES, OnboardingSlideCard } from './OnboardingSlideCard';

export interface OnboardingWizardProps {
  onComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slide = ONBOARDING_SLIDES[currentIndex];
  const isLast = currentIndex === ONBOARDING_SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  return (
    <View style={styles.container}>
      {/* 상단 헤더: 스킵 버튼 */}
      <View style={styles.topNav}>
        <Text style={styles.topLogo}>🐾 편안하개 가이드</Text>
        {!isLast && (
          <TouchableOpacity activeOpacity={0.7} onPress={onComplete} style={styles.skipButton}>
            <Text style={styles.skipText}>건너뛰기</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 중앙 메인 카드 */}
      <OnboardingSlideCard slide={slide} />

      {/* 단계 인디케이터 */}
      <View style={styles.indicatorRow}>
        {ONBOARDING_SLIDES.map((_, idx) => (
          <View
            key={`dot_${idx}`}
            style={[styles.indicatorDot, idx === currentIndex && styles.indicatorDotActive]}
          />
        ))}
      </View>

      {/* 하단 액션 버튼 영역 */}
      <View style={styles.actionRow}>
        {currentIndex > 0 && (
          <TouchableOpacity activeOpacity={0.8} onPress={handlePrev} style={styles.prevButton}>
            <Text style={styles.prevText}>이전</Text>
          </TouchableOpacity>
        )}

        <View style={styles.nextButtonWrapper}>
          <GradientButton fullWidth onPress={handleNext}>
            {isLast ? '🐾 우리 아이와 첫 산책 시작하기' : '다음 단계로 →'}
          </GradientButton>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  topNav: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topLogo: {
    fontSize: 14,
    fontWeight: '700',
    color: TOKENS.colors.primaryDark,
  },
  skipButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 13,
    color: TOKENS.colors.textMuted,
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TOKENS.colors.borderSubtle,
  },
  indicatorDotActive: {
    width: 24,
    backgroundColor: TOKENS.colors.primary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prevButton: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: TOKENS.borderRadius.button,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    backgroundColor: TOKENS.colors.surface,
  },
  prevText: {
    fontSize: 14,
    fontWeight: '600',
    color: TOKENS.colors.textMuted,
  },
  nextButtonWrapper: {
    flex: 1,
  },
});
