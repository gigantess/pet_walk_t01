/**
 * [편안하개 - PetWalk]
 * 모바일 홈 골든타임 위젯 (Screen-01, US-B2, US-F1)
 *
 * 기상청 실시간 기온 및 지면열 추정 모델 연동
 * - 지면온도 안전(<=35℃) / 주의(35~45℃) / 위험(>45℃) 상태 반영
 * - 당일 계절/일사량 맞춤 골든타임 윈도우(1.5~2시간 슬롯) 동적 시각화
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HeatRiskResponse } from '../../types/weather';
import { useAppTheme } from '../../theme/themeManager';
import { AppIcon } from '../common/AppIcon';

export interface GoldenTimeWidgetProps {
  readonly weather?: HeatRiskResponse | null;
  readonly currentTimeLabel?: string;
  readonly startTimeLabel?: string;
  readonly endTimeLabel?: string;
  readonly progressPercent?: number;
  readonly statusNotice?: string;
}

export const GoldenTimeWidget: React.FC<GoldenTimeWidgetProps> = ({
  weather,
  currentTimeLabel,
  startTimeLabel,
  endTimeLabel,
  progressPercent,
  statusNotice,
}) => {
  const { colors } = useAppTheme();
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const nowLabel =
    currentTimeLabel ??
    `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

  const currentTemp = weather?.current_surface_temp ?? 24.5;
  const riskLevel =
    weather?.current_risk_level ??
    (currentTemp <= 35 ? 'SAFE' : currentTemp <= 45 ? 'CAUTION' : 'DANGER');

  const isSafe = riskLevel === 'SAFE';
  const isCaution = riskLevel === 'CAUTION';
  const isDanger = riskLevel === 'DANGER';

  // 내일 골든타임 여부 판별 (Issue #50: golden_time_window_day === 'tomorrow' 또는 접두사 '내일')
  const isTomorrow =
    weather?.golden_time_window_day === 'tomorrow' ||
    Boolean(weather?.golden_time_window && weather.golden_time_window.startsWith('내일'));

  // 1.5~2시간 집중 골든타임 윈도우 파싱 (예: "18:00 ~ 20:00" 또는 "내일 06:00 ~ 10:00")
  let start = startTimeLabel;
  let end = endTimeLabel;

  if (!start || !end) {
    if (weather?.golden_time_window && weather.golden_time_window.includes('~')) {
      const parts = weather.golden_time_window
        .split('~')
        .map((s) => s.trim().replace(/^내일\s*/, ''));
      start = start ?? parts[0] ?? '18:00';
      end = end ?? parts[1] ?? '20:00';
    } else {
      start = start ?? '18:00';
      end = end ?? '20:00';
    }
  }

  // 시각 형식("HH:MM") 유효성 확인
  const timeRegex = /^\d{1,2}:\d{2}$/;
  const hasValidTimes = Boolean(
    start &&
    end &&
    timeRegex.test(start.trim()) &&
    timeRegex.test(end.trim())
  );

  let isUpcoming = false;
  let isPast = false;
  let computedProgress = 0;

  if (isTomorrow) {
    // 내일 구간인 경우: 아직 시작 전이므로 진행 막대는 0%, upcoming 상태 (Issue #50)
    isUpcoming = true;
    isPast = false;
    computedProgress = 0;
  } else if (!hasValidTimes) {
    // 구간 문구가 시각 형식이 아닌 경우(예: "일몰 후 (19:00 ~ 22:00) 권장"): 막대 계산 건너뛰기 (Issue #50)
    computedProgress = 0;
  } else {
    const startH = Number.parseInt(start.split(':')[0], 10) || 18;
    const startM = Number.parseInt(start.split(':')[1], 10) || 0;
    const endH = Number.parseInt(end.split(':')[0], 10) || 20;
    const endM = Number.parseInt(end.split(':')[1], 10) || 0;

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const currentMinutes = currentHour * 60 + currentMin;
    const duration = Math.max(30, endMinutes - startMinutes);

    if (currentMinutes < startMinutes) {
      isUpcoming = true;
      computedProgress = 0;
    } else if (currentMinutes > endMinutes) {
      isPast = true;
      computedProgress = 100;
    } else {
      computedProgress = Math.round(((currentMinutes - startMinutes) / duration) * 100);
    }
  }

  const progress = Math.max(0, Math.min(100, progressPercent ?? computedProgress));

  // 상태별 테마 색상 (위험: 레드/로즈, 주의: 앰버/오렌지, 안전: 에메랄드/그린)
  const statusColor = isDanger ? '#EF4444' : isCaution ? '#F59E0B' : colors.primaryDark;
  const statusBg = isDanger ? '#FEE2E2' : isCaution ? '#FEF3C7' : colors.primaryLight;
  const statusBorder = isDanger ? '#FCA5A5' : isCaution ? '#FCD34D' : colors.primaryMint;

  // 표시용 시간 라벨 (내일이면 "내일 06:00" 처럼 표시)
  const startDisplay = isTomorrow ? `내일 ${start}` : start;
  const timeRangeDisplay = isTomorrow ? `내일 ${start} ~ ${end}` : `${start} ~ ${end}`;

  // 서브텍스트 및 알림 메시지 구성
  let subtitleText = '';
  let badgeNotice = statusNotice;

  if (isDanger) {
    subtitleText = `현재 지면열이 ${currentTemp.toFixed(1)}℃로 매우 뜨거워요. ${startDisplay} 이후 서늘한 산책을 추천해요.`;
    if (!badgeNotice) {
      badgeNotice = `현재 ${nowLabel} · 지면 ${currentTemp.toFixed(1)}℃ 고열 위험 · ${startDisplay} 권장`;
    }
  } else if (isCaution) {
    subtitleText = `현재 지면온도 ${currentTemp.toFixed(1)}℃로 다소 높아요. 아스팔트 대신 그늘길 산책을 권장해요.`;
    if (!badgeNotice) {
      badgeNotice = `현재 ${nowLabel} · 지면 ${currentTemp.toFixed(1)}℃ (그늘길 위주 20분 내 산책)`;
    }
  } else {
    subtitleText = `지면온도 ${currentTemp.toFixed(1)}℃로 발바닥이 편안하고 안전해요.`;
    if (!badgeNotice) {
      badgeNotice = `현재 ${nowLabel} · 지면 ${currentTemp.toFixed(1)}℃ (발바닥 안심 골든타임)`;
    }
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isDanger ? '#FECACA' : isCaution ? '#FDE68A' : colors.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <AppIcon name="sun" size={18} color={statusColor} />
        <Text style={[styles.title, { color: colors.textMain }]}>산책하기 좋은 지면온도 시간</Text>
        {isDanger ? (
          <View style={[styles.liveBadge, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.liveBadgeText, { color: '#B91C1C' }]}>고열 주의</Text>
          </View>
        ) : isCaution ? (
          <View style={[styles.liveBadge, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.liveBadgeText, { color: '#B45309' }]}>주의</Text>
          </View>
        ) : weather?.isLiveServer ? (
          <View style={[styles.liveBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.liveBadgeText, { color: colors.primaryDark }]}>기상청 연동</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.subText, { color: isDanger ? '#DC2626' : colors.textMuted }]}>
        {subtitleText}
      </Text>

      {/* 1.5~2시간 집중 추천 슬롯 헤더 */}
      <View style={styles.slotHeaderRow}>
        <Text style={[styles.slotBadgeText, { color: statusColor }]}>
          {isTomorrow
            ? `🕒 다음 추천 골든타임 (${timeRangeDisplay})`
            : isUpcoming
              ? `🕒 다음 추천 골든타임 (${timeRangeDisplay})`
              : isPast
                ? `오늘 골든타임 종료 (${timeRangeDisplay})`
                : `✨ 지금 안심 골든타임 (${timeRangeDisplay})`}
        </Text>
      </View>

      {/* 게이지 타임라인 */}
      <View style={styles.timelineRow}>
        <Text style={[styles.timeLabel, isTomorrow && styles.timeLabelWide, { color: colors.textMuted }]}>
          {startDisplay}
        </Text>
        <View style={[styles.track, { backgroundColor: isDanger ? '#FEE2E2' : colors.borderSubtle }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
                backgroundColor: isDanger ? '#EF4444' : isCaution ? '#F59E0B' : colors.primary,
              },
            ]}
          />
          <View
            style={[
              styles.indicator,
              {
                left: `${progress}%`,
                backgroundColor: statusColor,
              },
            ]}
          >
            <View style={styles.indicatorDot} />
          </View>
        </View>
        <Text style={[styles.timeLabel, { textAlign: 'right', color: colors.textMuted }]}>{end}</Text>
      </View>

      <View style={styles.badgeContainer}>
        <View style={[styles.statusBadge, { backgroundColor: statusBg, borderColor: statusBorder }]}>
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>{badgeNotice}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  title: { fontSize: 13.5, fontWeight: '700' },
  liveBadge: { marginLeft: 'auto', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  liveBadgeText: { fontSize: 9, fontWeight: '800' },
  subText: { fontSize: 11, marginBottom: 6, paddingLeft: 24, lineHeight: 15 },
  slotHeaderRow: {
    paddingLeft: 24,
    marginBottom: 4,
  },
  slotBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  timeLabel: { fontSize: 10, fontWeight: '600', minWidth: 36 },
  timeLabelWide: { minWidth: 54 },
  track: { flex: 1, height: 6, borderRadius: 3, position: 'relative', justifyContent: 'center' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  indicator: {
    position: 'absolute',
    top: '50%',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ translateX: -7 }, { translateY: -7 }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' },
  badgeContainer: { alignItems: 'center' },
  statusBadge: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
});
