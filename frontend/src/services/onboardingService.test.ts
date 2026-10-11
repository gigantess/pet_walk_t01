/**
 * [편안하개 - PetWalk]
 * US-21 OnboardingService 단위 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OnboardingService } from './onboardingService';
import { LocalStorageService } from './storage';
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

describe('US-21 OnboardingService - 온보딩 위저드 영속성', () => {
  beforeEach(() => {
    memoryStore.clear();
  });

  it('초기 상태에서는 온보딩을 본 적이 없으므로 false를 반환해야 한다', async () => {
    expect(await OnboardingService.hasSeenOnboarding()).toBe(false);
  });

  it('markOnboardingCompleted 호출 후에는 hasSeenOnboarding이 true를 반환해야 한다', async () => {
    const ok = await OnboardingService.markOnboardingCompleted();
    expect(ok).toBe(true);
    expect(await OnboardingService.hasSeenOnboarding()).toBe(true);
    expect(memoryStore.get(STORAGE_KEYS.HAS_SEEN_ONBOARDING)).toBe('true');
  });

  it('resetOnboarding 호출 시 온보딩 상태가 다시 false로 리셋되어야 한다', async () => {
    await OnboardingService.markOnboardingCompleted();
    expect(await OnboardingService.hasSeenOnboarding()).toBe(true);

    const resetOk = await OnboardingService.resetOnboarding();
    expect(resetOk).toBe(true);
    expect(await OnboardingService.hasSeenOnboarding()).toBe(false);
  });

  it('LocalStorageService.clearAll 실행 시 온보딩 이력도 함께 영구 삭제되어야 한다', async () => {
    await OnboardingService.markOnboardingCompleted();
    expect(await OnboardingService.hasSeenOnboarding()).toBe(true);

    await LocalStorageService.clearAll();
    expect(await OnboardingService.hasSeenOnboarding()).toBe(false);
  });
});
