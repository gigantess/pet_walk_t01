/**
 * [편안하개 - PetWalk]
 * 로컬 데이터 완전 초기화 카드 컴포넌트 (US-23)
 *
 * 로컬에 보관된 프로필, 산책 기록, 즐겨찾기, 동의 이력 영구 삭제
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CardWrapper } from '../common/CardWrapper';
import { confirmAction } from '../../services/confirm';

export interface DataResetCardProps {
  onReset: () => Promise<void>;
  onCompleted?: () => void;
}

export const DataResetCard: React.FC<DataResetCardProps> = ({ onReset, onCompleted }) => {
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handlePressReset = async () => {
    const confirmed = await confirmAction(
      '모든 기록을 삭제할까요?',
      '스마트폰에 저장된 모든 반려견 프로필, 산책 기록, 찜한 코스가 영구히 삭제됩니다.\n정말 삭제하시겠습니까?',
      { confirmLabel: '전체 삭제', destructive: true }
    );

    if (!confirmed) return;

    try {
      setIsResetting(true);
      await onReset();
      setResetMessage('스마트폰에 저장된 모든 기록이 안전하게 삭제되었습니다.');
      onCompleted?.();
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <CardWrapper variant="flat" style={styles.card}>
      <Text style={styles.title}>🔒 개인정보 보호 및 전체 기록 삭제</Text>
      <Text style={styles.description}>
        스마트폰에 저장된 모든 기록(반려견 프로필, 산책 이력, 찜한 코스, 위치 설정)을 깨끗하게 삭제합니다.
      </Text>

      {Boolean(resetMessage) && (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>✓ {resetMessage}</Text>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.8}
        disabled={isResetting}
        onPress={() => void handlePressReset()}
        style={[styles.resetButton, isResetting && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>
          {isResetting ? '기록 삭제 중...' : '🗑️ 저장된 모든 기록 삭제하기'}
        </Text>
      </TouchableOpacity>
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    marginBottom: 20,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
  },
  description: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  messageBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  messageText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
  },
  resetButton: {
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F87171',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
});
