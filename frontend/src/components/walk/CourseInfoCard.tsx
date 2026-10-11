/**
 * [편안하개 - PetWalk]
 * AI 추천 코스 요약 카드 (Screen-04, US-B1, US-29)
 *
 * 코스명 / 추천 순번 / 즐겨찾기 토글 / 3대 간략 지표(폭신·그늘·계단)
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TOKENS } from '../../theme/tokens';
import { RecommendedCourse } from '../../types/walkSettings';
import { BookmarkedRoute } from '../../types/bookmark';
import { BookmarkToggleButton } from '../bookmark/BookmarkToggleButton';

export interface CourseInfoCardProps {
  readonly course: RecommendedCourse;
  readonly rank: number;
  readonly bookmark: BookmarkedRoute | null;
}

const StatBox: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.statBox}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

export const CourseInfoCard: React.FC<CourseInfoCardProps> = ({ course, rank, bookmark }) => (
  <View style={styles.card}>
    <View style={styles.header}>
      <Text style={styles.name}>{course.name}</Text>
      <View style={styles.actions}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>추천 {rank}</Text>
        </View>
        <BookmarkToggleButton bookmark={bookmark} />
      </View>
    </View>
    <Text style={styles.stats}>
      {course.distanceKm} · 약 {course.estimatedMinutes}분
    </Text>
    <View style={styles.statsRow}>
      <StatBox icon="🌿" label="폭신한 길" value={course.softRatio} />
      <StatBox icon="🌳" label="그늘 구간" value={course.shadeLevel} />
      <StatBox icon="🚶" label="계단" value={course.stairsCount} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.borderRadius.card,
    padding: 18,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontSize: 17, fontWeight: '700', color: TOKENS.colors.textMain },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { backgroundColor: TOKENS.colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700', color: TOKENS.colors.primaryDark },
  stats: { fontSize: 13, color: TOKENS.colors.textMuted, marginBottom: 14 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: TOKENS.colors.border, paddingTop: 12, gap: 8 },
  statBox: { flex: 1, alignItems: 'center' },
  statIcon: { fontSize: 16, marginBottom: 2 },
  statLabel: { fontSize: 11, color: TOKENS.colors.textMuted, marginBottom: 2 },
  statValue: { fontSize: 13, fontWeight: '700', color: TOKENS.colors.textMain },
});
