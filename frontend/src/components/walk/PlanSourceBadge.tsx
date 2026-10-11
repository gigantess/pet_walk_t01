/**
 * [편안하개 - PetWalk]
 * 경로 데이터 출처 뱃지 (Live AI 서버 vs 로컬 오프라인 폴백)
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const PlanSourceBadge: React.FC<{ isLive: boolean }> = ({ isLive }) => (
  <View style={styles.bar}>
    <View style={[styles.badge, isLive ? styles.badgeLive : styles.badgeOffline]}>
      <Text style={[styles.text, isLive ? styles.textLive : styles.textOffline]}>
        {isLive ? '✨ 실시간 AI 맞춤 코스' : '🌿 안심 기본 코스'}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  badgeLive: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
  badgeOffline: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  text: { fontSize: 11, fontWeight: '600' },
  textLive: { color: '#059669' },
  textOffline: { color: '#4B5563' },
});
