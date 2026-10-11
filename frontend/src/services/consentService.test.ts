/**
 * [편안하개 - PetWalk]
 * US-23 위치 정보 수집 투명 고지 및 로컬 데이터 영구 초기화 단위 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConsentService } from './consentService';
import { CONSENT_POLICY_VERSION } from '../types/consent';
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
    getAllKeys: vi.fn(async () => Array.from(memoryStore.keys())),
    multiRemove: vi.fn(async (keys: string[]) => {
      for (const k of keys) {
        memoryStore.delete(k);
      }
    }),
  },
}));

describe('US-23 ConsentService - 위치 동의 및 투명 고지', () => {
  beforeEach(() => {
    memoryStore.clear();
  });

  it('초기 상태에서는 동의 이력이 없고 hasAgreed가 false이다', async () => {
    expect(await ConsentService.getConsent()).toBeNull();
    expect(await ConsentService.hasAgreed()).toBe(false);
  });

  it('saveAgreement 호출 시 최신 정책 버전과 로컬저장/200m 마스킹 고지 승인이 함께 기록된다', async () => {
    const fixedTime = new Date('2026-10-11T12:00:00.000Z');
    const ok = await ConsentService.saveAgreement(fixedTime);
    expect(ok).toBe(true);

    const consent = await ConsentService.getConsent();
    expect(consent).not.toBeNull();
    expect(consent?.hasAgreed).toBe(true);
    expect(consent?.policyVersion).toBe(CONSENT_POLICY_VERSION);
    expect(consent?.localOnlyNoticeAcknowledged).toBe(true);
    expect(consent?.spatialMaskingAcknowledged).toBe(true);
    expect(consent?.agreedAt).toBe(fixedTime.toISOString());

    expect(await ConsentService.hasAgreed()).toBe(true);
  });

  it('동의 이력이 있더라도 정책 버전이 다르면 hasAgreed는 false를 반환하여 재동의를 유도한다', async () => {
    memoryStore.set(
      STORAGE_KEYS.LOCATION_CONSENT,
      JSON.stringify({
        hasAgreed: true,
        agreedAt: '2025-01-01T00:00:00.000Z',
        policyVersion: '0.9',
        localOnlyNoticeAcknowledged: true,
        spatialMaskingAcknowledged: true,
      })
    );

    expect(await ConsentService.hasAgreed()).toBe(false);
  });

  it('resetAllLocalData는 @편안하개 네임스페이스 키만 일괄 영구 삭제하고 타사 키는 보존한다', async () => {
    // 1. 사전 데이터 적재
    memoryStore.set(STORAGE_KEYS.DOG_PROFILE, JSON.stringify({ name: '초코' }));
    memoryStore.set(STORAGE_KEYS.WALK_HISTORY, JSON.stringify([{ id: 'walk_1' }]));
    memoryStore.set(STORAGE_KEYS.BOOKMARKED_ROUTES, JSON.stringify([{ id: 'bm_1' }]));
    await ConsentService.saveAgreement();
    memoryStore.set('@thirdparty:session_token', 'secret_token_123');

    expect(memoryStore.size).toBe(5);

    // 2. 전체 초기화 수행
    const cleared = await ConsentService.resetAllLocalData();
    expect(cleared).toBe(true);

    // 3. 편안하개 데이터는 모두 삭제되고 타사 키만 남아있어야 함
    expect(memoryStore.has(STORAGE_KEYS.DOG_PROFILE)).toBe(false);
    expect(memoryStore.has(STORAGE_KEYS.WALK_HISTORY)).toBe(false);
    expect(memoryStore.has(STORAGE_KEYS.BOOKMARKED_ROUTES)).toBe(false);
    expect(memoryStore.has(STORAGE_KEYS.LOCATION_CONSENT)).toBe(false);
    expect(memoryStore.get('@thirdparty:session_token')).toBe('secret_token_123');

    // 4. 초기화 후 동의 상태는 다시 false
    expect(await ConsentService.hasAgreed()).toBe(false);
    expect(await ConsentService.getConsent()).toBeNull();
  });
});
