"""[US-A3, US-B3] 출발지 기반 동적 순환 코스 생성기.

사용자의 실제 출발 좌표와 목표 거리에서 원형 웨이포인트를 만들고,
OSRM 보행 라우팅(Footway) 결과의 실측 거리가 목표에서 벗어나면 웨이포인트 반경을 보정한다.
3개 대안 코스(방향별)는 병렬로 질의하여 응답 지연을 줄인다.

오프라인(OSRM 실패) 시에는 서울광장 인근 한정 정적 도로망 좌표 또는
목표 거리에 맞춘 직사각형 폴백을 사용한다. 직사각형 폴백은 건물을 관통할 수 있는 임시 대체 수단이다.
"""

import logging
import math
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from agent.road_network_routes import (
    V1_ROAD_ALIGNED_COORDS,
    V2_ROAD_ALIGNED_COORDS,
    V3_ROAD_ALIGNED_COORDS,
    fetch_osrm_foot_route,
)
from agent.offline_walk_network import plan_offline_network_loop
from agent.route_geometry import (
    backtrack_ratio,
    collapse_backtracks,
    destination_point,
    haversine_m,
    loop_closure_gap_m,
    polyline_length_m,
)
from agent.route_steps import build_turn_steps

logger = logging.getLogger(__name__)

# 후보 코스별 순환 방향(방위각). 서로 다른 방향의 도로망을 탐색해 대안을 확보한다.
VARIANT_BEARINGS: Dict[int, float] = {1: 30.0, 2: 150.0, 3: 270.0}
DETOUR_FACTOR = 1.35  # 원 둘레 대비 실제 보행망 거리의 초기 추정 비율
LOOP_WAYPOINT_COUNT = 6
DISTANCE_TOLERANCE = 0.10  # 이 오차 이내이면 보정 종료 (인수 조건 ±15% 에 여유 확보)
MAX_REFINEMENTS = 2
SCALE_LIMITS = (0.4, 2.5)
OSRM_TIMEOUT_S = 1.5
PLAN_TIME_BUDGET_S = 3.0
MAX_BACKTRACK_RATIO = 0.15
MAX_CLOSURE_GAP_M = 15.0
STATIC_MATCH_RADIUS_M = 300.0
FALLBACK_EDGE_SPACING_M = 25.0
M_PER_DEG_LAT = 111_320.0

STATIC_SEOUL_LOOPS: Dict[int, List[List[float]]] = {
    1: V1_ROAD_ALIGNED_COORDS,
    2: V2_ROAD_ALIGNED_COORDS,
    3: V3_ROAD_ALIGNED_COORDS,
}
# 폴백 직사각형의 세로/가로 비율 (후보별로 모양을 달리한다)
FALLBACK_ASPECT_RATIOS: Dict[int, float] = {1: 0.6, 2: 1.0, 3: 1.6}


@dataclass(frozen=True)
class LoopPlan:
    """순환 코스 생성 결과. source 는 osrm_live / static_seoul / rectangle_fallback."""
    coords: List[List[float]]
    steps: List[Dict[str, Any]]
    distance_m: float
    source: str


def build_loop_waypoints(
    origin_lat: float,
    origin_lon: float,
    loop_length_m: float,
    bearing: float,
) -> List[Tuple[float, float]]:
    """출발지를 지나는 원형 순환 웨이포인트 (위도, 경도) 목록. 첫 점과 마지막 점은 출발지이다."""
    radius = loop_length_m / (2 * math.pi)
    center_lat, center_lon = destination_point(origin_lat, origin_lon, bearing, radius)
    origin_angle = (bearing + 180.0) % 360.0
    step_deg = 360.0 / LOOP_WAYPOINT_COUNT
    points = [(origin_lat, origin_lon)]
    for k in range(1, LOOP_WAYPOINT_COUNT):
        points.append(destination_point(center_lat, center_lon, (origin_angle + k * step_deg) % 360.0, radius))
    points.append((origin_lat, origin_lon))
    return points


def _route_waypoints(waypoints: List[Tuple[float, float]]) -> Optional[List[List[float]]]:
    """OSRM 보행 경로를 질의하고 왕복 구간을 정리한 좌표열을 반환한다."""
    result = fetch_osrm_foot_route(waypoints, timeout_seconds=OSRM_TIMEOUT_S)
    if not result:
        return None
    cleaned = collapse_backtracks(result[0])
    return cleaned if len(cleaned) >= 4 else None


def _is_valid_loop(coords: List[List[float]]) -> bool:
    """순환 종결성과 왕복 비율 기준을 충족하는지 검사한다."""
    return loop_closure_gap_m(coords) <= MAX_CLOSURE_GAP_M and backtrack_ratio(coords) <= MAX_BACKTRACK_RATIO


def _plan_live(
    origin_lat: float,
    origin_lon: float,
    target_distance_m: float,
    variant: int,
    deadline: float,
) -> Optional[LoopPlan]:
    """OSRM 실시간 경로를 질의하고 목표 거리에 수렴하도록 반경을 보정한다."""
    loop_length = target_distance_m / DETOUR_FACTOR
    best: Optional[Tuple[List[List[float]], float]] = None
    for _ in range(MAX_REFINEMENTS + 1):
        waypoints = build_loop_waypoints(origin_lat, origin_lon, loop_length, VARIANT_BEARINGS[variant])
        coords = _route_waypoints(waypoints)
        if coords is None:
            break
        length = polyline_length_m(coords)
        error = abs(length - target_distance_m) / target_distance_m
        if _is_valid_loop(coords) and (best is None or error < best[1]):
            best = (coords, error)
        if error <= DISTANCE_TOLERANCE or time.monotonic() >= deadline:
            break
        loop_length *= min(max(target_distance_m / length, SCALE_LIMITS[0]), SCALE_LIMITS[1])
    if best is None or best[1] > DISTANCE_TOLERANCE + 0.05:
        return None
    return _to_plan(best[0], "osrm_live")


def _to_plan(coords: List[List[float]], source: str) -> LoopPlan:
    return LoopPlan(
        coords=coords,
        steps=build_turn_steps(coords),
        distance_m=round(polyline_length_m(coords), 1),
        source=source,
    )


def _plan_static_seoul(
    origin_lat: float,
    origin_lon: float,
    variant: int,
    target_distance_m: Optional[float] = None,
) -> Optional[LoopPlan]:
    """출발지가 서울광장 인근일 때만 사용하는 오프라인 정적 도로망 코스.

    목표 거리가 주어진 경우 실측 거리가 목표 거리의 허용 오차(15%) 이내일 때만 채택한다.
    """
    static = STATIC_SEOUL_LOOPS.get(variant)
    if not static:
        return None
    if haversine_m((origin_lon, origin_lat), static[0]) > STATIC_MATCH_RADIUS_M:
        return None
    coords = collapse_backtracks(static)
    if not _is_valid_loop(coords):
        return None
    if target_distance_m is not None and target_distance_m > 0:
        length = polyline_length_m(coords)
        if abs(length - target_distance_m) / target_distance_m > DISTANCE_TOLERANCE + 0.05:
            return None
    return _to_plan(coords, "static_seoul")


def _densify_edge(start: Tuple[float, float], end: Tuple[float, float]) -> List[List[float]]:
    """[경도, 위도] 두 점 사이를 약 25m 간격으로 보간한다(끝점 제외)."""
    count = max(1, math.ceil(haversine_m(start, end) / FALLBACK_EDGE_SPACING_M))
    return [
        [start[0] + (end[0] - start[0]) * i / count, start[1] + (end[1] - start[1]) * i / count]
        for i in range(count)
    ]


def _plan_rectangle_fallback(
    origin_lat: float,
    origin_lon: float,
    target_distance_m: float,
    variant: int,
) -> LoopPlan:
    """목표 거리에 맞춘 직사각형 순환 코스. 도로망 정보가 없으므로 건물을 관통할 수 있다."""
    aspect = FALLBACK_ASPECT_RATIOS[variant]
    width_m = target_distance_m / (2 * (1 + aspect))
    d_lat = (width_m * aspect) / M_PER_DEG_LAT
    d_lon = width_m / (M_PER_DEG_LAT * math.cos(math.radians(origin_lat)))
    corners = [
        (origin_lon, origin_lat),
        (origin_lon, origin_lat + d_lat),
        (origin_lon + d_lon, origin_lat + d_lat),
        (origin_lon + d_lon, origin_lat),
    ]
    coords: List[List[float]] = []
    for i, corner in enumerate(corners):
        coords.extend(_densify_edge(corner, corners[(i + 1) % len(corners)]))
    coords.append(list(corners[0]))
    return _to_plan(coords, "rectangle_fallback")


def _plan_offline_network(
    origin_lat: float,
    origin_lon: float,
    target_distance_m: float,
    variant: int,
) -> Optional[LoopPlan]:
    """오프라인 실제 보행 도로망 그래프에서 건물 관통 없는 순환 코스 생성."""
    res = plan_offline_network_loop(origin_lat, origin_lon, target_distance_m, variant)
    if res is None:
        return None
    coords, dist_m, _ = res
    if not _is_valid_loop(coords):
        return None
    # The offline graph has discrete loop lengths. Keep its walkable route even
    # when it misses the target; the caller reports the actual measured distance.
    return _to_plan(coords, "offline_network")


def _plan_variant(
    origin_lat: float,
    origin_lon: float,
    target_distance_m: float,
    variant: int,
    deadline: float,
) -> LoopPlan:
    """실시간 → 정적 도로망 → 오프라인 도로망 그래프 → 비상 폴백 순으로 후보 1개를 생성한다."""
    plan = _plan_live(origin_lat, origin_lon, target_distance_m, variant, deadline)
    if plan is not None:
        return plan
    logger.warning("OSRM 순환 코스 생성 실패(variant=%d): 오프라인 도로망 폴백을 사용합니다.", variant)
    plan = _plan_static_seoul(origin_lat, origin_lon, variant, target_distance_m=target_distance_m)
    if plan is not None:
        return plan
    plan = _plan_offline_network(origin_lat, origin_lon, target_distance_m, variant)
    if plan is not None:
        return plan
    return _plan_rectangle_fallback(origin_lat, origin_lon, target_distance_m, variant)


def plan_loop_candidates(
    origin_lat: float,
    origin_lon: float,
    target_distance_m: float,
    time_budget_s: float = PLAN_TIME_BUDGET_S,
) -> Dict[int, LoopPlan]:
    """방향이 다른 순환 후보 3종을 병렬로 생성한다. 키는 후보 번호(1~3)."""
    deadline = time.monotonic() + time_budget_s
    # Give the second variant a distinct planning target so it does not collapse
    # onto the same coarse offline cycle as the primary route.
    distance_factors = {1: 1.0, 2: 1.2, 3: 1.1}
    with ThreadPoolExecutor(max_workers=len(VARIANT_BEARINGS)) as pool:
        futures = {
            variant: pool.submit(
                _plan_variant,
                origin_lat,
                origin_lon,
                target_distance_m * distance_factors[variant],
                variant,
                deadline,
            )
            for variant in VARIANT_BEARINGS
        }
        plans = {variant: future.result() for variant, future in futures.items()}

    # Sparse offline graphs can resolve multiple bearings to the same cycle.
    # For the Seoul City Hall area, substitute a validated road-aligned loop
    # for a duplicate so choosing another candidate changes the actual route.
    seen_routes = {
        tuple((round(lon, 6), round(lat, 6)) for lon, lat in plan.coords)
        for plan in plans.values()
    }
    for variant, plan in plans.items():
        signature = tuple((round(lon, 6), round(lat, 6)) for lon, lat in plan.coords)
        if sum(
            tuple((round(lon, 6), round(lat, 6)) for lon, lat in existing.coords) == signature
            for existing in plans.values()
        ) <= 1:
            continue

        alternate = _plan_static_seoul(origin_lat, origin_lon, 1)
        if alternate is None:
            continue
        alternate_signature = tuple((round(lon, 6), round(lat, 6)) for lon, lat in alternate.coords)
        if alternate_signature not in seen_routes:
            plans[variant] = alternate
            seen_routes.add(alternate_signature)

    return plans
