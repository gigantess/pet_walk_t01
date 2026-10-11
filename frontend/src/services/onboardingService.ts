/**
 * [편안하개 - PetWalk]
 * 인터랙티브 온보딩 위저드 영속성 관리 서비스 (US-21)
 */

import { STORAGE_KEYS } from '../types/storage';
import { LocalStorageService } from './storage';

export class OnboardingService {
  /**
   * 온보딩 완료 여부 조회
   */
  static async hasSeenOnboarding(): Promise<boolean> {
    const seen = await LocalStorageService.getItem<boolean>(STORAGE_KEYS.HAS_SEEN_ONBOARDING);
    return Boolean(seen);
  }

  /**
   * 온보딩 완료 상태 기록
   */
  static async markOnboardingCompleted(): Promise<boolean> {
    return LocalStorageService.setItem(STORAGE_KEYS.HAS_SEEN_ONBOARDING, true);
  }

  /**
   * 온보딩 상태 초기화 (다시보기 테스트용)
   */
  static async resetOnboarding(): Promise<boolean> {
    return LocalStorageService.removeItem(STORAGE_KEYS.HAS_SEEN_ONBOARDING);
  }
}
