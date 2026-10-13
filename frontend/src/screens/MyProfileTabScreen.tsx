/**
 * [편안하개 - PetWalk]
 * 모바일 마이 프로필 탭 화면 (US-A2, US-E3, US-G2)
 *
 * 반려견 프로필 편집, 산책 기록 목록(후기 공개 토글), 즐겨찾기, 로컬 백업
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { TOKENS } from '../theme/tokens';
import { DogProfile } from '../types/dogProfile';
import { CardWrapper } from '../components/common/CardWrapper';
import { BackupService } from '../services/backupService';
import { BookmarkListView } from '../components/bookmark/BookmarkListView';
import { BookmarkedRoute } from '../types/bookmark';
import { DataResetCard } from '../components/privacy/DataResetCard';
import { FeedbackSummaryPayload } from '../services/feedbackContext';
import { DogProfileEditCard } from '../components/profile/DogProfileEditCard';
import { MyWalkHistoryView } from '../components/profile/MyWalkHistoryView';
import { SupabaseService } from '../services/supabaseService';

export interface MyProfileTabScreenProps {
  dog: DogProfile;
  feedbackSummary?: FeedbackSummaryPayload | null;
  onSaveDog: (fields: Partial<DogProfile>) => void;
  onInjectFeedback: (dissatisfied: boolean) => void;
  onResetFeedback?: () => void;
  onStartBookmark: (bookmark: BookmarkedRoute) => void;
  onResetData?: () => Promise<void>;
  onOpenOnboarding?: () => void;
  onOpenAuthModal?: () => void;
}

export const MyProfileTabScreen: React.FC<MyProfileTabScreenProps> = ({
  dog, feedbackSummary, onSaveDog, onInjectFeedback, onResetFeedback, onStartBookmark, onResetData, onOpenOnboarding, onOpenAuthModal,
}) => {
  const [resetCount, setResetCount] = useState(0);
  const currentUser = SupabaseService.getCurrentUser();

  const handleBackupDownload = () => {
    const ok = BackupService.downloadProfileJsonFile(dog);
    if (ok) {
      Alert.alert('프로필 저장 완료', `🐾 ${dog.name} 프로필 파일이 기기에 다운로드되었습니다.`);
    } else {
      const jsonStr = BackupService.exportProfileToJson(dog);
      Alert.alert('프로필 내보내기', `백업 데이터가 생성되었습니다:\n${jsonStr.slice(0, 80)}...`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionSubtitle}>반려견 안심 케어 프로필</Text>
        <Text style={styles.sectionTitle}>우리 아이 정보 관리 🐾</Text>
      </View>

      {/* Supabase 클라우드 계정 연동 상태 (US-G2) */}
      <CardWrapper variant="flat" style={{ marginBottom: 16 }}>
        <View style={styles.accountRow}>
          <View>
            <Text style={styles.accountTitle}>☁️ Supabase 클라우드 계정</Text>
            <Text style={styles.accountSubtitle}>
              {currentUser ? `${currentUser.email} (로그인됨)` : '로컬 게스트 모드 (비로그인)'}
            </Text>
          </View>
          {onOpenAuthModal && (
            <TouchableOpacity onPress={onOpenAuthModal} style={styles.accountBtn}>
              <Text style={styles.accountBtnText}>{currentUser ? '계정 전환' : '클라우드 로그인'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </CardWrapper>

      {/* 반려견 프로필 편집 카드 */}
      <DogProfileEditCard dog={dog} onSaveDog={onSaveDog} />

      {/* 🐾 마이페이지 산책 기록 목록 및 커뮤니티 공개 토글 (US-G2, PR #42) */}
      <MyWalkHistoryView dogName={dog.name} />

      {/* 내 보관함 (즐겨찾기 안심 코스) */}
      <BookmarkListView key={resetCount} onStartBookmark={onStartBookmark} dogSpeedKmH={dog.speedKmH} />

      {/* 반려견 프로필 파일 보관 및 복원 */}
      <CardWrapper variant="flat" style={{ marginBottom: 16 }}>
        <Text style={styles.cardHeaderTitle}>💾 반려견 프로필 백업 및 복원</Text>
        <Text style={styles.backupDesc}>
          소중한 반려견 프로필을 내 스마트폰 파일로 안전하게 보관하고 필요할 때 불러옵니다.
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleBackupDownload}
          style={[styles.simButton, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', marginTop: 10 }]}
        >
          <Text style={{ color: '#065F46', fontSize: 12, fontWeight: '700' }}>
            📥 내 프로필 파일로 저장하기
          </Text>
        </TouchableOpacity>
      </CardWrapper>

      {/* AI 경로 보정 시뮬레이터 (개발/시연용 가상 피드백) */}
      <CardWrapper variant="flat">
        <Text style={styles.cardHeaderTitle}>🧪 [시연/테스트] AI 산책로 보정 시뮬레이터</Text>
        <Text style={styles.backupDesc}>
          실제 산책을 돌지 않고도 가상의 보행 피드백을 주입하여 AI 맞춤 경로 보정을 테스트합니다.
        </Text>
        {feedbackSummary && (
          <View style={styles.simStatusBadge}>
            <Text style={styles.simStatusText}>
              📊 최근 {feedbackSummary.recent_walk_count}회 · 경사 불만족 {feedbackSummary.slope_dissatisfaction_count}회 (보정치: {feedbackSummary.recommended_max_slope_offset}%)
            </Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <TouchableOpacity
            onPress={() => onInjectFeedback(true)}
            style={[styles.simButton, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5', flex: 1, minWidth: 140 }]}
          >
            <Text style={{ color: '#991B1B', fontSize: 12, fontWeight: '600' }}>+ "경사 부담" 주입</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onInjectFeedback(false)}
            style={[styles.simButton, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', flex: 1, minWidth: 140 }]}
          >
            <Text style={{ color: '#065F46', fontSize: 12, fontWeight: '600' }}>+ "완만한 길" 주입</Text>
          </TouchableOpacity>
          {onResetFeedback && (
            <TouchableOpacity
              onPress={onResetFeedback}
              style={[styles.simButton, { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB', width: '100%', flex: undefined }]}
            >
              <Text style={{ color: '#4B5563', fontSize: 12, fontWeight: '600' }}>↺ 피드백 초기화 (0회)</Text>
            </TouchableOpacity>
          )}
        </View>
      </CardWrapper>

      {/* 이용 안내 가이드 투어 다시 보기 */}
      {onOpenOnboarding && (
        <CardWrapper variant="flat" style={{ marginBottom: 12, marginTop: 16 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onOpenOnboarding}
            style={[styles.simButton, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
          >
            <Text style={{ color: '#166534', fontSize: 13, fontWeight: '700' }}>
              📖 첫 산책 가이드 투어 다시 보기
            </Text>
          </TouchableOpacity>
        </CardWrapper>
      )}

      {/* 로컬 데이터 완전 초기화 */}
      {onResetData && (
        <DataResetCard onReset={onResetData} onCompleted={() => setResetCount((c) => c + 1)} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionHeader: { marginBottom: 14 },
  sectionSubtitle: { fontSize: 13, color: TOKENS.colors.textMuted },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: TOKENS.colors.textMain, letterSpacing: -0.5 },
  accountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accountTitle: { fontSize: 13, fontWeight: '700', color: TOKENS.colors.textMain },
  accountSubtitle: { fontSize: 11, color: TOKENS.colors.textMuted, marginTop: 2 },
  accountBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: TOKENS.colors.primaryLight },
  accountBtnText: { fontSize: 11, fontWeight: '700', color: TOKENS.colors.primaryDark },
  cardHeaderTitle: { fontSize: 14, fontWeight: '700', color: TOKENS.colors.textMain },
  backupDesc: { fontSize: 12, color: TOKENS.colors.textMuted, marginTop: 4, lineHeight: 18 },
  simButton: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  simStatusBadge: { backgroundColor: '#F3F4F6', padding: 8, borderRadius: 8, marginTop: 8 },
  simStatusText: { fontSize: 11, color: TOKENS.colors.textMuted, fontWeight: '600' },
});
