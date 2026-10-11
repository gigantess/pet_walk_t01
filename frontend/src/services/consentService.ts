/**
 * [편안하개 - PetWalk]
 * 위치 정보 수집 동의 및 로컬 관리 서비스 (US-23)
 *
 * Local-First 철학:
 * 1. 30m 전 핸즈프리 음성 안내 및 맞춤 이동 측정 목적으로만 활용
 * 2. 상세 궤적은 외부 서버 전송 없이 스마트폰에만 안전 저장
 * 3. 커뮤니티 공유 시 200m 공간 마스킹 보호
 */

import { CONSENT_POLICY_VERSION, LocationConsentStatus } from '../types/consent';
import { STORAGE_KEYS } from '../types/storage';
import { LocalStorageService } from './storage';

export class ConsentService {
  /**
   * 저장된 위치 수집 동의 상태 조회
   */
  static async getConsent(): Promise<LocationConsentStatus | null> {
    return LocalStorageService.getItem<LocationConsentStatus>(STORAGE_KEYS.LOCATION_CONSENT);
  }

  /**
   * 유효한 최신 정책 버전으로 동의를 완료했는지 여부 확인
   */
  static async hasAgreed(): Promise<boolean> {
    const status = await this.getConsent();
    if (!status) return false;
    return Boolean(status.hasAgreed && status.policyVersion === CONSENT_POLICY_VERSION);
  }

  /**
   * 위치 수집 및 로컬 저장/마스킹 투명 고지 동의 기록 저장
   */
  static async saveAgreement(now = new Date()): Promise<boolean> {
    const status: LocationConsentStatus = {
      hasAgreed: true,
      agreedAt: now.toISOString(),
      policyVersion: CONSENT_POLICY_VERSION,
      localOnlyNoticeAcknowledged: true,
      spatialMaskingAcknowledged: true,
    };
    return LocalStorageService.setItem(STORAGE_KEYS.LOCATION_CONSENT, status);
  }

  /**
   * 기기 내 모든 편안하개 로컬 데이터 영구 삭제 (US-23 초기화)
   */
  static async resetAllLocalData(): Promise<boolean> {
    return LocalStorageService.clearAll();
  }
}
