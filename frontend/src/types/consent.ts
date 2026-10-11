/**
 * [편안하개 - PetWalk]
 * 위치 정보 수집 동의 이력 DTO (US-23)
 */

export const CONSENT_POLICY_VERSION = '1.0' as const;

export interface LocationConsentStatus {
  hasAgreed: boolean;
  agreedAt: string;
  policyVersion: typeof CONSENT_POLICY_VERSION;
  /** 상세 궤적이 기기 로컬에만 저장됨을 고지받았는지 */
  localOnlyNoticeAcknowledged: boolean;
  /** 커뮤니티 공유 시 출발/도착지 200m 마스킹을 고지받았는지 */
  spatialMaskingAcknowledged: boolean;
}
