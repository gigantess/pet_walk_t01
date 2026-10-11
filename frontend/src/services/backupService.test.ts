/**
 * [편안하개 - PetWalk]
 * US-A2 프로필 JSON 로컬 백업 & 복원 엔진 단위 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BackupService, BackupPayload } from './backupService';
import { LocalStorageService } from './storage';
import { DogProfile } from '../types/dogProfile';
import { STORAGE_KEYS } from '../types/storage';

const memoryStore = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => memoryStore.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      memoryStore.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      memoryStore.delete(key);
    }),
  },
}));

const mockDog: DogProfile = {
  id: 'dog_choco',
  name: '초코',
  breed: '말티즈',
  ageYears: 3,
  weightKg: 4.2,
  jointCareLevel: 1,
  speedKmH: 2.5,
  preference: '30분 산책 선호',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

describe('US-A2 BackupService - 프로필 JSON 백업 및 복원', () => {
  beforeEach(() => {
    memoryStore.clear();
  });

  it('프로필을 JSON 문자열로 내보낼 수 있어야 한다', () => {
    const jsonStr = BackupService.exportProfileToJson(mockDog);
    expect(jsonStr).toBeDefined();

    const parsed = JSON.parse(jsonStr) as BackupPayload;
    expect(parsed.version).toBe('1.0');
    expect(parsed.service).toBe('편안하개 (PetWalk)');
    expect(parsed.profile.name).toBe('초코');
    expect(parsed.profile.weightKg).toBe(4.2);
  });

  it('내보낸 JSON 문자열을 정상적으로 파싱하고 유효성을 검증해야 한다', () => {
    const jsonStr = BackupService.exportProfileToJson(mockDog);
    const restored = BackupService.parseAndValidateBackup(jsonStr);

    expect(restored).not.toBeNull();
    expect(restored?.name).toBe('초코');
    expect(restored?.breed).toBe('말티즈');
    expect(restored?.weightKg).toBe(4.2);
    expect(restored?.jointCareLevel).toBe(1);
  });

  it('필수 필드(name, weightKg)가 누락된 잘못된 JSON인 경우 null을 반환해야 한다', () => {
    const invalidJson1 = JSON.stringify({ version: '1.0', profile: { ageYears: 3 } });
    expect(BackupService.parseAndValidateBackup(invalidJson1)).toBeNull();

    const invalidJson2 = '{ malformed json: true ';
    expect(BackupService.parseAndValidateBackup(invalidJson2)).toBeNull();
  });

  it('JSON 문자열을 로컬 스토리지에 복원하면 저장소에 반영되어야 한다', async () => {
    const jsonStr = BackupService.exportProfileToJson(mockDog);
    const restoredDog = await BackupService.restoreFromJsonString(jsonStr);

    expect(restoredDog).not.toBeNull();
    expect(restoredDog?.name).toBe('초코');

    const inStorage = await LocalStorageService.getItem<DogProfile>(STORAGE_KEYS.DOG_PROFILE);
    expect(inStorage).not.toBeNull();
    expect(inStorage?.name).toBe('초코');
    expect(inStorage?.weightKg).toBe(4.2);
  });
});
