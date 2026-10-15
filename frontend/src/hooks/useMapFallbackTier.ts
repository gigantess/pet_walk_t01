/**
 * [편안하개 - PetWalk]
 * 지도 폴백 단계 상태 훅 (T-OFM-7)
 *
 * - 기본은 1차(OpenFreeMap). degrade() 호출 시 다음 단계로 전환합니다.
 * - 테마 변경 등으로 resetKey가 바뀌면 다시 1차부터 시도합니다.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { MapFallbackTier, getNextFallbackTier } from '../constants/mapFallback';

export function useMapFallbackTier(hasStaticRoute: boolean, resetKey: string) {
  const [tier, setTier] = useState<MapFallbackTier>('openfreemap');
  const hasStaticRouteRef = useRef(hasStaticRoute);
  hasStaticRouteRef.current = hasStaticRoute;

  useEffect(() => {
    setTier('openfreemap');
  }, [resetKey]);

  const degrade = useCallback(() => {
    setTier((current) => getNextFallbackTier(current, hasStaticRouteRef.current) ?? current);
  }, []);

  return { tier, degrade };
}
