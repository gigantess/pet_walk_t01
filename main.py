"""[편안하개 - PetWalk]
FastAPI 메인 애플리케이션 엔트리포인트 (v1 REST API).

- CORS 설정 (Expo Web http://localhost:8081 및 모바일 클라이언트 지원)
- POST /api/v1/walk/plan (LangGraph ReAct Walk Planning Agent 코어 연동)
- POST /api/v1/community/share (US-G2 200m 공간 마스킹 코스 공유)
- GET /api/v1/community/feed (공개 안심 코스 피드)
- GET /health (헬스체크)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from agent.walk_planning_agent import run_walk_planning_agent
from agent.road_network_routes import V1_ROAD_ALIGNED_COORDS
from agent.supabase_repository import community_repo
from test_case.test_api_contracts import (
    apply_spatial_masking_to_course,
    WalkPlanResponseV1,
    CommunityCourseShareRequest,
    CommunityCourseSummary,
)

app = FastAPI(
    title="편안하개 (PetWalk) API",
    description="AI Native 반려견 맞춤형 안심 노면 산책 에이전트 및 핸즈프리 모바일 플랫폼 REST API",
    version="1.0.0",
)

# 🌐 크로스 오리진(CORS) 미들웨어 설정 (Expo Web 및 모바일 통신 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {
        "service": "편안하개 (PetWalk) Core API",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs"
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "mode": "live",
        "supabase_connected": community_repo.is_connected(),
    }


def _parse_recent_feedback(req: Dict[str, Any]) -> List[Dict[str, Any]]:
    rf = req.get("recent_feedback")
    if not rf:
        return []
    feedback = []
    if rf.get("slope_dissatisfaction_count", 0) > 0:
        feedback.append({"tag": "too_steep", "count": rf["slope_dissatisfaction_count"]})
    if rf.get("shade_preference_count", 0) > 0:
        feedback.append({"tag": "cool_shade", "count": rf["shade_preference_count"]})
    return feedback


def _build_candidate_course(cand: Any, score: Optional[float] = None, fallback_reason: str = "") -> Dict[str, Any]:
    surface_types = cand.surface_types or []
    is_soft = "grass" in surface_types or "dirt" in surface_types
    reason = (
        f"AI 맞춤 점수 {score:.0f}점: {cand.name} (경사 {cand.max_slope_percent}% 이하)"
        if score is not None
        else fallback_reason
    )
    return {
        "id": cand.route_id,
        "name": cand.name,
        "distanceKm": f"{cand.total_distance_m / 1000.0:.1f} km",
        "estimatedMinutes": int(cand.estimated_duration_minutes),
        "softRatio": "85%" if is_soft else "60%",
        "shadeLevel": "많음" if cand.average_shade_ratio > 0.5 else "보통",
        "stairsCount": "0회" if not cand.has_stairs else "계단 있음",
        "maxSlopePercent": cand.max_slope_percent,
        "shadePercent": int(cand.average_shade_ratio * 100),
        "softSurfacePercent": 85 if "grass" in surface_types else 65,
        "reason": reason,
    }


def _build_course_list(agent_result: Any) -> List[Dict[str, Any]]:
    if agent_result.all_scored_candidates:
        return [
            _build_candidate_course(scored.candidate, score=scored.total_score)
            for scored in agent_result.all_scored_candidates[:3]
        ]
    return [_build_candidate_course(agent_result.best_route, fallback_reason=agent_result.briefing_message)]


def _build_segmented_geojson(coords: List[List[float]], max_slope: float) -> Dict[str, Any]:
    """경로 좌표열을 안전/보통/주의 3대 안심 등급 구간으로 분할하여 다채로운 지도 시각화 제공."""
    if len(coords) < 4:
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"segmentType": "safe", "maxSlopePercent": max_slope, "shaded": True},
                    "geometry": {"type": "LineString", "coordinates": coords}
                }
            ]
        }
    n = len(coords)
    i1 = max(1, n // 4)
    i2 = max(i1 + 1, (2 * n) // 4)
    i3 = max(i2 + 1, (3 * n) // 4)

    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"segmentType": "safe", "maxSlopePercent": round(max(1.5, max_slope * 0.4), 1), "shaded": True},
                "geometry": {"type": "LineString", "coordinates": coords[: i1 + 1]}
            },
            {
                "type": "Feature",
                "properties": {"segmentType": "normal", "maxSlopePercent": round(max(2.2, max_slope * 0.7), 1), "shaded": False},
                "geometry": {"type": "LineString", "coordinates": coords[i1 : i2 + 1]}
            },
            {
                "type": "Feature",
                "properties": {"segmentType": "caution", "maxSlopePercent": round(max_slope, 1), "shaded": False},
                "geometry": {"type": "LineString", "coordinates": coords[i2 : i3 + 1]}
            },
            {
                "type": "Feature",
                "properties": {"segmentType": "safe", "maxSlopePercent": round(max(1.4, max_slope * 0.3), 1), "shaded": True},
                "geometry": {"type": "LineString", "coordinates": coords[i3 :]}
            },
        ]
    }


def _build_step_pins(cand: Any, coords: List[List[float]]) -> List[Dict[str, Any]]:
    """실제 방향 전환 교차점 및 주의 구간 핀 목록 생성."""
    steps = getattr(cand, "turn_by_turn_steps", None) or []
    pins: List[Dict[str, Any]] = []
    for idx, step in enumerate(steps):
        pos = step.get("position")
        if not pos and len(coords) > idx + 1:
            pos = coords[idx + 1]
        elif not pos:
            pos = coords[0]
        pins.append({
            "id": f"{cand.route_id}_step_{idx + 1}",
            "kind": "caution" if "주의" in step.get("instruction", "") else "turn",
            "position": pos,
            "instruction": step.get("instruction", "안전하게 직진하세요"),
        })
    if not pins and len(coords) > 1:
        pins.append({
            "id": f"{cand.route_id}_step_1",
            "kind": "turn",
            "position": coords[1],
            "instruction": "보행로를 따라 안전하게 직진하세요",
        })
    return pins


@app.post(
    "/api/v1/walk/plan",
    responses={
        500: {"description": "LangGraph AI Agent 오케스트레이션 내부 오류"}
    },
)
def plan_walk_route(req: Dict[str, Any]):
    """[US-A1, US-A3, US-B1~B3, US-E3] LangGraph ReAct Walk Planning Agent 코어 연동 엔드포인트."""
    dog_name = req.get("dog_name", "아이")
    target_duration = req.get("target_duration_minutes", 30)
    origin_lat = req.get("origin_lat", 37.5665)
    origin_lon = req.get("origin_lon", 126.9780)

    user_query = f"{dog_name}와 {target_duration}분 동안 폭신한 길 위주로 걷고 싶어요."

    client_dog = {
        "dog_id": req.get("dog_id", "dog_default"),
        "name": dog_name,
        "breed": req.get("breed", "반려견"),
        "age_years": req.get("age_years", 4),
        "weight_kg": req.get("weight_kg", 4.0),
        "speed_kmh": req.get("speed_kmh", 2.8),
        "joint_care_level": req.get("joint_care_level", 1),
    }

    recent_feedback = _parse_recent_feedback(req)

    try:
        agent_result = run_walk_planning_agent(
            user_query=user_query,
            client_dog_context=client_dog,
            client_recent_feedback=recent_feedback,
            origin_lat=origin_lat,
            origin_lon=origin_lon,
        )

        best = agent_result.best_route
        coords = best.geojson_coordinates if best.geojson_coordinates else V1_ROAD_ALIGNED_COORDS

        geojson = _build_segmented_geojson(coords, best.max_slope_percent)
        step_pins = _build_step_pins(best, coords)
        courses = _build_course_list(agent_result)

        course_plans: Dict[str, Any] = {}
        if agent_result.all_scored_candidates:
            for scored in agent_result.all_scored_candidates:
                cand = scored.candidate
                cand_coords = cand.geojson_coordinates if cand.geojson_coordinates else coords
                course_plans[cand.route_id] = {
                    "route": _build_segmented_geojson(cand_coords, cand.max_slope_percent),
                    "stepPins": _build_step_pins(cand, cand_coords),
                }

        return {
            "courses": courses,
            "geojson": geojson,
            "step_pins": step_pins,
            "course_plans": course_plans,
            "briefing": agent_result.briefing_message,
            "score": agent_result.best_score,
            "is_live_server": True,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/v1/community/share")
def share_community_course(req: CommunityCourseShareRequest):
    """[US-G2] 출발지 및 도착지 200m 공간 마스킹 후 Supabase PostgreSQL / 인메모리 피드 등록."""
    mask_result = apply_spatial_masking_to_course(req.raw_coordinates, masking_radius_m=200.0)
    current_count = len(community_repo.get_feeds())
    new_feed = {
        "course_id": f"feed_{current_count + 1}",
        "title": req.course_title,
        "masked_polyline": mask_result["masked_coordinates"],
        "distance_m": 1400.0,
        "duration_min": 22,
        "rating": float(req.satisfaction_rating),
        "is_origin_masked": mask_result["is_masked"],
    }
    saved_feed = community_repo.save_course(new_feed)
    return {
        "status": "shared",
        "feed": saved_feed,
        "is_supabase": community_repo.is_connected(),
    }


@app.get("/api/v1/community/feed")
def get_community_feed():
    """공유된 안심 코스 피드 목록 조회 (Supabase DB 우선, 인메모리 자동 폴백)."""
    return {
        "feeds": community_repo.get_feeds(),
        "is_supabase": community_repo.is_connected(),
    }
