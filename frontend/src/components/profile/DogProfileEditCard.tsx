/**
 * [편안하개 - PetWalk]
 * 반려견 안심 케어 프로필 편집 카드 (US-A2)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { TOKENS } from '../../theme/tokens';
import { DogProfile, JointCareLevel } from '../../types/dogProfile';
import { CardWrapper } from '../common/CardWrapper';
import { GradientButton } from '../common/GradientButton';
import { DogAvatar } from '../common/DogAvatar';
import { PhotoPickerModal } from './PhotoPickerModal';

export interface DogProfileEditCardProps {
  readonly dog: DogProfile;
  readonly onSaveDog: (fields: Partial<DogProfile>) => void;
}

export const DogProfileEditCard: React.FC<DogProfileEditCardProps> = ({ dog, onSaveDog }) => {
  const [pickerVisible, setPickerVisible] = useState(false);

  return (
    <CardWrapper style={{ marginBottom: 16 }}>
      {/* 반려견 대표 사진 & 변경 영역 */}
      <View style={styles.photoRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setPickerVisible(true)}
          style={styles.avatarTouchArea}
        >
          <DogAvatar photoUri={dog.photoUri} size={60} />
          <View style={styles.cameraBadge}>
            <Text style={styles.cameraIcon}>📷</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.photoInfoArea}>
          <Text style={styles.photoTitle}>우리 아이 대표 사진</Text>
          <Text style={styles.photoSub}>
            {dog.photoUri ? '대표 사진이 등록되어 있습니다' : '사진을 등록해주세요'}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setPickerVisible(true)}
            style={styles.changePhotoBtn}
          >
            <Text style={styles.changePhotoText}>
              {dog.photoUri ? '사진/캐릭터 변경' : '대표 사진 등록'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.fieldLabel}>이름</Text>
      <TextInput
        value={dog.name}
        onChangeText={(text) => onSaveDog({ name: text })}
        style={styles.input}
      />

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>나이 (세)</Text>
          <TextInput
            value={String(dog.ageYears)}
            keyboardType="numeric"
            onChangeText={(text) => onSaveDog({ ageYears: Number(text) || 0 })}
            style={styles.input}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>체중 (kg)</Text>
          <TextInput
            value={String(dog.weightKg)}
            keyboardType="numeric"
            onChangeText={(text) => onSaveDog({ weightKg: Number(text) || 0 })}
            style={styles.input}
          />
        </View>
      </View>

      <Text style={[styles.fieldLabel, { marginTop: 12 }]}>관절 안심 케어 수준</Text>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
        {[0, 1, 2].map((lvl) => {
          const isSelected = dog.jointCareLevel === lvl;
          const labels = ['일반', '주의', '적극보호'];
          return (
            <TouchableOpacity
              key={lvl}
              onPress={() => onSaveDog({ jointCareLevel: lvl as JointCareLevel })}
              style={[styles.levelChip, isSelected && styles.levelChipSelected]}
            >
              <Text style={[styles.levelChipText, isSelected && styles.levelChipTextSelected]}>
                {labels[lvl]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <GradientButton
        fullWidth
        onPress={() => Alert.alert('저장 완료', '🐾 반려견 프로필이 안전하게 저장되었습니다!')}
        style={{ marginTop: 16 }}
      >
        반려견 프로필 저장 ✓
      </GradientButton>

      <PhotoPickerModal
        visible={pickerVisible}
        currentPhotoUri={dog.photoUri}
        onClose={() => setPickerVisible(false)}
        onSelectPhoto={(uri) => onSaveDog({ photoUri: uri })}
      />
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.border,
  },
  avatarTouchArea: {
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: TOKENS.colors.surface,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  cameraIcon: {
    fontSize: 10,
  },
  photoInfoArea: {
    flex: 1,
  },
  photoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TOKENS.colors.textMain,
  },
  photoSub: {
    fontSize: 11,
    color: TOKENS.colors.textMuted,
    marginTop: 2,
    marginBottom: 6,
  },
  changePhotoBtn: {
    alignSelf: 'flex-start',
    backgroundColor: TOKENS.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  changePhotoText: {
    fontSize: 11,
    fontWeight: '700',
    color: TOKENS.colors.primaryDark,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: TOKENS.colors.textMain, marginBottom: 4 },
  input: {
    backgroundColor: TOKENS.colors.background,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: TOKENS.colors.textMain,
  },
  levelChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    alignItems: 'center',
    backgroundColor: TOKENS.colors.background,
  },
  levelChipSelected: { borderColor: TOKENS.colors.primary, backgroundColor: TOKENS.colors.primaryLight },
  levelChipText: { fontSize: 12, fontWeight: '500', color: TOKENS.colors.textMuted },
  levelChipTextSelected: { color: TOKENS.colors.primaryDark, fontWeight: '700' },
});
