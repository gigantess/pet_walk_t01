/**
 * [편안하개 - PetWalk]
 * 돌발 상황 원터치 퀵 음소거 및 사운드 제어 플로팅 바 (US-C2, #37)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TOKENS } from '../../theme/tokens';
import { AppIcon } from '../common/AppIcon';
import { SoundSettings } from '../../types/voiceSettings';
import { TTSNavigationService } from '../../services/ttsNavigation';
import { VoiceSettingModal } from './VoiceSettingModal';

export interface VoiceQuickControlBarProps {
  compact?: boolean;
}

export const VoiceQuickControlBar: React.FC<VoiceQuickControlBarProps> = ({ compact = false }) => {
  const [settings, setSettings] = useState<SoundSettings>(() => TTSNavigationService.getSettings());
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    return TTSNavigationService.subscribe((next) => {
      setSettings(next);
    });
  }, []);

  const handleToggleMute = () => {
    void TTSNavigationService.toggleMute();
  };

  const isMuted = settings.isMuted || settings.volume <= 0;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleToggleMute}
          style={[styles.compactMuteBtn, isMuted && styles.compactMuteBtnActive]}
        >
          <AppIcon
            name={isMuted ? 'volumeMute' : 'volume'}
            size={18}
            color={isMuted ? '#F59E0B' : TOKENS.colors.pocketHud}
          />
          <Text style={[styles.compactMuteText, isMuted && styles.compactMuteTextActive]}>
            {isMuted ? '음소거' : `${Math.round(settings.volume * 100)}%`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setModalVisible(true)}
          style={styles.compactSettingsBtn}
        >
          <AppIcon name="sparkle" size={16} color={TOKENS.colors.pocketHud} />
        </TouchableOpacity>

        <VoiceSettingModal visible={modalVisible} onClose={() => setModalVisible(false)} />
      </View>
    );
  }

  return (
    <View style={styles.barContainer}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleToggleMute}
        style={[styles.mainMuteCard, isMuted && styles.mainMuteCardActive]}
      >
        <View style={styles.leftRow}>
          <View style={[styles.iconBox, isMuted && styles.iconBoxActive]}>
            <AppIcon
              name={isMuted ? 'volumeMute' : 'volume'}
              size={18}
              color={isMuted ? '#B45309' : TOKENS.colors.primaryDark}
            />
          </View>
          <View>
            <Text style={[styles.statusTitle, isMuted && styles.statusTitleActive]}>
              {isMuted ? '음소거 중 (발화 중단)' : `음성 안내 켜짐 (${Math.round(settings.volume * 100)}%)`}
            </Text>
            <Text style={styles.statusDesc}>
              {isMuted ? '돌발 상황 대비 음소거됨 · 터치 시 즉시 해제' : '개 짖음/소음 시 터치하여 즉시 음소거'}
            </Text>
          </View>
        </View>

        <View style={[styles.actionTag, isMuted && styles.actionTagActive]}>
          <Text style={[styles.actionTagText, isMuted && styles.actionTagTextActive]}>
            {isMuted ? '해제' : '음소거'}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
        style={styles.settingTriggerBtn}
      >
        <AppIcon name="sparkle" size={18} color={TOKENS.colors.primaryDark} />
        <Text style={styles.settingTriggerText}>보이스 설정</Text>
      </TouchableOpacity>

      <VoiceSettingModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },
  mainMuteCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TOKENS.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.border,
  },
  mainMuteCardActive: {
    backgroundColor: '#FEF3C7',
    borderColor: TOKENS.colors.warning,
  },
  leftRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 6 },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TOKENS.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: { backgroundColor: '#FDE68A' },
  statusTitle: { fontSize: 13, fontWeight: '700', color: TOKENS.colors.textMain },
  statusTitleActive: { color: '#B45309' },
  statusDesc: { fontSize: 10, color: TOKENS.colors.textMuted, marginTop: 1 },
  actionTag: {
    backgroundColor: TOKENS.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  actionTagActive: { backgroundColor: '#F59E0B', borderColor: '#D97706' },
  actionTagText: { fontSize: 11, fontWeight: '700', color: TOKENS.colors.textMain },
  actionTagTextActive: { color: TOKENS.colors.textWhite },
  settingTriggerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  settingTriggerText: { fontSize: 10, fontWeight: '700', color: TOKENS.colors.primaryDark },

  // 다크 포켓 컴팩트 모드 스타일
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    marginTop: 10,
  },
  compactMuteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: TOKENS.colors.pocketHud,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  compactMuteBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
  },
  compactMuteText: { fontSize: 12, fontWeight: '700', color: TOKENS.colors.pocketHud },
  compactMuteTextActive: { color: '#F59E0B' },
  compactSettingsBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
  },
});
