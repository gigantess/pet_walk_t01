/**
 * [편안하개 - PetWalk]
 * 완주 체크인 & 인포그래픽 리포트 화면 (Screen-05, UX_COMPACT_RULES Rule 11 스크롤 배제 준수)
 *
 * 1. 상단: 컴팩트 완주 축하 배너
 * 2. 중단: 4대 핵심 보행 지표 & 피드백·공유 액션 바
 * 3. 하단: Thumb Zone 홈 복귀 버튼
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useAppTheme } from '../theme/themeManager';
import { WalkRecord, WalkFeedback } from '../types/storage';
import { QuickFeedbackModal } from '../components/feedback/QuickFeedbackModal';
import { BookmarkToggleButton } from '../components/bookmark/BookmarkToggleButton';
import { BookmarkedRoute } from '../types/bookmark';
import { AppIcon } from '../components/common/AppIcon';
import { ShareCourseModal } from '../components/community/ShareCourseModal';
import { shareCommunityCourse } from '../services/communityApi';

export interface WalkReportScreenProps {
  record: WalkRecord;
  dogName: string;
  onSaveFeedback: (feedback: WalkFeedback) => void;
  onGoHome: () => void;
  onGoToCommunity?: () => void;
  bookmarkCandidate?: BookmarkedRoute | null;
}

const SLOPE_LABELS: Record<string, string> = {
  gentle: '완만/평지',
  moderate: '적당함',
  steep: '가파름',
};

export const WalkReportScreen: React.FC<WalkReportScreenProps> = ({
  record,
  dogName,
  onSaveFeedback,
  onGoHome,
  onGoToCommunity,
  bookmarkCandidate = null,
}) => {
  const { colors } = useAppTheme();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const safeRatioPercent = Math.round(record.safeSurfaceRatio * 100);

  const handleShareCourse = async (title: string, rating: number) => {
    setIsSharing(true);
    try {
      const rawCoords: [number, number][] =
        record.gpsTrack && record.gpsTrack.length > 0
          ? record.gpsTrack.map((p) => [p.lon, p.lat] as [number, number])
          : [[127.038, 37.544], [127.040, 37.545], [127.039, 37.543]];
      const res = await shareCommunityCourse(title, rawCoords, rating);
      setIsSharing(false);
      setShowShareModal(false);
      const msg = res.is_supabase
        ? '이웃과 코스를 공유했어요!\n출발·도착지 200m는 자동 보호되어 집 위치가 안전해요.'
        : '이웃과 안심 코스를 공유했어요! (200m 사생활 보호 적용)';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`[코스 공유 완료]\n${msg}`);
      } else {
        Alert.alert('코스 공유 완료', msg);
      }
      if (onGoToCommunity) onGoToCommunity();
    } catch (err) {
      console.warn('[WalkReportScreen] 코스 공유 예외 처리:', err);
      setIsSharing(false);
      setShowShareModal(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 1. 상단: 컴팩트 완주 축하 헤더 */}
      <View style={[styles.congratsCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
        <View style={styles.congratsTitleRow}>
          <View style={[styles.badgeIcon, { backgroundColor: colors.primary }]}>
            <AppIcon name="paw" size={14} color={colors.textWhite} />
          </View>
          <Text style={[styles.congratsTitle, { color: colors.textMain }]}>
            {dogName}와 안심 산책 완주!
          </Text>
        </View>
        <Text style={[styles.congratsSubtitle, { color: colors.textMuted }]}>
          발바닥과 관절이 편안한 산책을 무사히 마쳤어요.
        </Text>
      </View>

      {/* 2. 중단 4대 핵심 지표 그리드 (한눈에 확인) */}
      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>총 이동 거리</Text>
          <Text style={[styles.statValue, { color: colors.textMain }]}>
            {record.totalDistanceKm.toFixed(2)}<Text style={styles.statUnit}>km</Text>
          </Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>소요 시간</Text>
          <Text style={[styles.statValue, { color: colors.textMain }]}>
            {record.durationMinutes}<Text style={styles.statUnit}>분</Text>
          </Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>평균 속도</Text>
          <Text style={[styles.statValue, { color: colors.textMain }]}>
            {record.averageSpeedKmH.toFixed(1)}<Text style={styles.statUnit}>km/h</Text>
          </Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>완만 노면율</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {safeRatioPercent}<Text style={styles.statUnit}>%</Text>
          </Text>
        </View>
      </View>

      {/* 배변 마킹 결과 뱃지 (US-18) */}
      {typeof record.poopCount === 'number' && record.poopCount > 0 && (
        <View style={[styles.poopBadgeBar, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <Text style={[styles.poopBadgeText, { color: colors.primaryDark }]}>
            💩 산책 중 배변 {record.poopCount}회 마킹 완료
          </Text>
        </View>
      )}

      {/* 3. 피드백 및 공유 원터치 카드 */}
      <View style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowFeedbackModal(true)}
          style={styles.feedbackRow}
        >
          <View style={styles.rowLeft}>
            <AppIcon name="edit" size={16} color={colors.primaryDark} />
            <Text style={[styles.rowTitle, { color: colors.textMain }]}>
              {record.feedback ? `체감 만족도: ⭐ ${record.feedback.comfortScore}점` : '3초 빠른 피드백 남기기'}
            </Text>
          </View>
          <Text style={[styles.actionLink, { color: colors.primary }]}>
            {record.feedback ? '수정 ▾' : '작성 ▾'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowShareModal(true)}
          style={styles.feedbackRow}
        >
          <View style={styles.rowLeft}>
            <AppIcon name="users" size={16} color={colors.primaryDark} />
            <Text style={[styles.rowTitle, { color: colors.textMain }]}>이웃과 안심 코스 공유 (200m 보호)</Text>
          </View>
          <View style={[styles.miniBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.miniBadgeText}>공유</Text>
          </View>
        </TouchableOpacity>

        {bookmarkCandidate && (
          <>
            <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
            <View style={styles.feedbackRow}>
              <View style={styles.rowLeft}>
                <AppIcon name="star" size={16} color={colors.primaryDark} />
                <Text style={[styles.rowTitle, { color: colors.textMain }]}>즐겨찾기 보관함 저장</Text>
              </View>
              <BookmarkToggleButton bookmark={bookmarkCandidate} />
            </View>
          </>
        )}
      </View>

      {/* 4. 하단 Thumb Zone 복귀 버튼 (Rule 3) */}
      <View style={styles.bottomArea}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onGoHome}
          style={[styles.homeBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        >
          <Text style={styles.homeBtnText}>홈으로 돌아가기</Text>
        </TouchableOpacity>
      </View>

      <QuickFeedbackModal visible={showFeedbackModal} dogName={dogName} onSubmit={onSaveFeedback} onClose={() => setShowFeedbackModal(false)} />
      <ShareCourseModal
        visible={showShareModal}
        defaultTitle={bookmarkCandidate?.title || '성산근린공원 폭신한 둘레길'}
        distanceKm={record.totalDistanceKm}
        durationMinutes={record.durationMinutes}
        safeSurfaceRatio={record.safeSurfaceRatio}
        isSubmitting={isSharing}
        onShare={handleShareCourse}
        onClose={() => setShowShareModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'space-between' },
  congratsCard: { padding: 14, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginBottom: 10 },
  congratsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  badgeIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  congratsTitle: { fontSize: 17, fontWeight: '800' },
  congratsSubtitle: { fontSize: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  statBox: { width: '48.5%', padding: 12, borderRadius: 14, borderWidth: 1 },
  statLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statUnit: { fontSize: 12, fontWeight: '500' },
  poopBadgeBar: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginBottom: 10 },
  poopBadgeText: { fontSize: 12, fontWeight: '700' },
  actionCard: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 10 },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  rowTitle: { fontSize: 13, fontWeight: '700' },
  actionLink: { fontSize: 12, fontWeight: '700' },
  cardDivider: { height: 1 },
  miniBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  miniBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  bottomArea: { marginTop: 'auto' },
  homeBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 3 },
  homeBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
