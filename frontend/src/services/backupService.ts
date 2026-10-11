/**
 * [편안하개 - PetWalk]
 * 프로필 JSON 로컬 백업 & 복원 엔진 (US-A2)
 *
 * Local-First 원칙:
 * - 클라우드 DB가 아닌 기기 로컬 파일로 프로필 내보내기/가져오기 지원
 * - 브라우저(Web 데모) 및 모바일(React Native) 환경 모두 호환
 */

import { DogProfile, JointCareLevel } from '../types/dogProfile';
import { LocalStorageService } from './storage';
import { STORAGE_KEYS } from '../types/storage';

export interface BackupPayload {
  version: '1.0';
  exportedAt: string;
  service: '편안하개 (PetWalk)';
  profile: DogProfile;
}

export class BackupService {
  /**
   * 프로필 JSON 데이터 생성 (US-A2)
   */
  static exportProfileToJson(profile: DogProfile): string {
    const payload: BackupPayload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      service: '편안하개 (PetWalk)',
      profile,
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * 브라우저 환경에서 JSON 파일 다운로드 트리거
   */
  static downloadProfileJsonFile(profile: DogProfile): boolean {
    try {
      const jsonStr = this.exportProfileToJson(profile);
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `편안하개_프로필_${profile.name}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('[BackupService] 파일 다운로드 실패:', error);
      return false;
    }
  }

  /**
   * JSON 문자열 파싱 및 프로필 검증 복원
   */
  static parseAndValidateBackup(jsonString: string): DogProfile | null {
    try {
      const parsed = JSON.parse(jsonString) as Record<string, unknown>;

      // 백업 포맷(BackupPayload) 또는 순수 DogProfile 모두 호환
      const candidate = (
        parsed.profile && typeof parsed.profile === 'object'
          ? (parsed.profile as Record<string, unknown>)
          : parsed
      );

      if (!candidate.name || typeof candidate.name !== 'string') {
        return null;
      }

      const weight = typeof candidate.weightKg === 'number' ? candidate.weightKg : Number(candidate.weightKg);
      if (Number.isNaN(weight) || weight <= 0) {
        return null;
      }

      const age = typeof candidate.ageYears === 'number' ? candidate.ageYears : Number(candidate.ageYears) || 1;
      const careLevel = [0, 1, 2].includes(Number(candidate.jointCareLevel))
        ? (Number(candidate.jointCareLevel) as JointCareLevel)
        : 0;

      const validProfile: DogProfile = {
        id: typeof candidate.id === 'string' && candidate.id ? candidate.id : `dog_${Date.now()}`,
        name: candidate.name.trim(),
        breed: typeof candidate.breed === 'string' && candidate.breed.trim() ? candidate.breed.trim() : '믹스견',
        ageYears: age,
        weightKg: weight,
        jointCareLevel: careLevel,
        speedKmH: typeof candidate.speedKmH === 'number' && candidate.speedKmH > 0 ? candidate.speedKmH : 2.8,
        preference: typeof candidate.preference === 'string' ? candidate.preference : undefined,
        photoUri: typeof candidate.photoUri === 'string' ? candidate.photoUri : undefined,
        avatarUrl: typeof candidate.avatarUrl === 'string' ? candidate.avatarUrl : undefined,
        createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return validProfile;
    } catch (error) {
      console.warn('[BackupService] JSON 백업 파싱 실패:', error);
      return null;
    }
  }

  /**
   * JSON 파일 문자열을 로컬 스토리지에 즉시 복원 저장 (US-A2)
   */
  static async restoreFromJsonString(jsonString: string): Promise<DogProfile | null> {
    const profile = this.parseAndValidateBackup(jsonString);
    if (!profile) return null;

    const saved = await LocalStorageService.setItem(STORAGE_KEYS.DOG_PROFILE, profile);
    return saved ? profile : null;
  }
}
