/**
 * [편안하개 - PetWalk]
 * 홈 화면 이번 주 산책 달성도 & 관절 케어 리포트 카드 (WeeklyWalkReportCard.tsx)
 *
 * 1. 주간 목표 달성률 (예: 주 4/5회 달성)
 * 2. 3대 보행 헬스케어 지표 (누적 거리, 총 소요 시간, 완만 노면율)
 * 3. 월~일 7일 미니 활동 인디케이터
 * 4. 관절 안심 케어 피드백 메시지
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../theme/themeManager';
import { AppIcon } from '../common/AppIcon';
import { WeeklyWalkStats } from '../../services/walkStatisticsService';

export interface WeeklyWalkReportCardProps {
  stats: WeeklyWalkStats;
  onPress?: () => void;
}

export const WeeklyWalkReportCard: React.FC<WeeklyWalkReportCardProps> = ({
  stats,
  onPress,
}) => {
  const { colors } = useAppTheme();

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {/* 1. 카드 헤더 */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
            <AppIcon name="sparkle" size={14} color={colors.primaryDark} />
          </View>
          <View>
            <Text style={[styles.cardTitle, { color: colors.textMain }]}>이번 주 산책 달성도</Text>
            <Text style={[styles.rangeSubtitle, { color: colors.textMuted }]}>
              {stats.weekRangeLabel}
            </Text>
          </View>
        </View>

        {/* 주간 목표 달성 뱃지 */}
        <View
          style={[
            styles.badge,
            {
              backgroundColor:
                stats.totalWalks >= stats.targetWalks ? colors.primaryLight : '#F1F5F9',
              borderColor:
                stats.totalWalks >= stats.targetWalks ? colors.primary : '#CBD5E1',
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              {
                color:
                  stats.totalWalks >= stats.targetWalks ? colors.primaryDark : '#475569',
              },
            ]}
          >
            주 {stats.totalWalks}/{stats.targetWalks}회 ({stats.completionRatePercent}%)
          </Text>
        </View>
      </View>

      {/* 2. 3대 지표 요약 박스 (누적 거리, 소요 시간, 완만 노면율) */}
      <View style={[styles.metricsContainer, { backgroundColor: colors.background }]}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>누적 거리</Text>
          <Text style={[styles.metricValue, { color: colors.textMain }]}>
            {stats.totalDistanceKm} <Text style={styles.metricUnit}>km</Text>
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>산책 시간</Text>
          <Text style={[styles.metricValue, { color: colors.textMain }]}>
            {stats.totalDurationMinutes} <Text style={styles.metricUnit}>분</Text>
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>완만 노면</Text>
          <Text style={[styles.metricValue, { color: colors.primaryDark }]}>
            {stats.safeSurfaceRatioPercent} <Text style={styles.metricUnit}>%</Text>
          </Text>
        </View>
      </View>

      {/* 3. 월~일 7일간 미니 활동 도트 인디케이터 */}
      <View style={styles.daysRow}>
        {stats.dailyStats.map((item) => (
          <View key={item.dateStr} style={styles.dayCol}>
            <View
              style={[
                styles.dayDot,
                item.hasWalked
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
                item.isToday && styles.todayDot,
              ]}
            >
              <Text
                style={[
                  styles.dayDotIcon,
                  item.hasWalked ? { color: '#FFFFFF' } : { color: '#94A3B8' },
                ]}
              >
                {item.hasWalked ? '🐾' : '·'}
              </Text>
            </View>
            <Text
              style={[
                styles.dayLabel,
                item.isToday
                  ? { color: colors.primaryDark, fontWeight: '800' }
                  : { color: colors.textMuted },
              ]}
            >
              {item.dayLabel}
            </Text>
          </View>
        ))}
      </View>

      {/* 4. 관절 안심 케어 한줄 브리핑 */}
      <View style={[styles.jointNoticeBox, { backgroundColor: colors.primaryLight }]}>
        <Text style={[styles.jointNoticeText, { color: colors.primaryDark }]} numberOfLines={1}>
          💡 {stats.jointCareMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  rangeSubtitle: {
    fontSize: 10,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 24,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dayCol: {
    alignItems: 'center',
    gap: 3,
  },
  dayDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayDot: {
    borderWidth: 2,
    borderColor: '#059669',
  },
  dayDotIcon: {
    fontSize: 10,
    fontWeight: '700',
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  jointNoticeBox: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
  },
  jointNoticeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
