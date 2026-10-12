"""[US-A3, US-C1] OSM 태그 및 DEM 실측 기반 노면/경사도 평가 파이프라인 테스트.

1. DEM 표고 추정 및 두 지점 간 경사도(%) 계산 정합성 검증.
2. 경사도 8% 이상 급경사/계단 구간의 'caution'(주황) 분류 검증.
3. 완만 구간(4% 미만) 및 친자연/그늘 노면의 'safe'(초록) 분류 검증.
4. GeoJSON 세그먼트 FeatureCollection의 연속성(모든 세그먼트 끝점==다음 시작점) 보장 검증.
"""

import pytest
from typing import List

from agent.surface_slope_evaluator import (
    estimate_elevation_m,
    calculate_segment_slope_percent,
    classify_segment_risk,
    evaluate_route_metrics,
    build_segmented_geojson,
)
from agent.walk_planning_agent import run_walk_planning_agent


class TestSurfaceSlopeEvaluator:
    """노면 및 경사도 평가 모듈 단위 테스트."""

    def test_dem_elevation_estimation_known_locations(self):
        """서울 주요 랜드마크의 DEM 해발 고도가 현실적인 범위에 수렴하는지 검증."""
        # 1. 서울숲 (한강변 평지: 6m ~ 15m)
        elev_forest = estimate_elevation_m(127.040, 37.540)
        assert 6.0 <= elev_forest <= 16.0

        # 2. 서울시청 (도심 평탄지형: 25m ~ 35m)
        elev_cityhall = estimate_elevation_m(126.978, 37.566)
        assert 24.0 <= elev_cityhall <= 35.0

        # 3. 덕수궁 돌담길/정동 언덕 (고도 상승: 28m ~ 50m)
        elev_jeongdong = estimate_elevation_m(126.972, 37.569)
        assert 30.0 <= elev_jeongdong <= 50.0

        # 4. 강남 테헤란로 역삼 고개 (서초 18m -> 역삼 35m 이상 상승)
        elev_gangnam_west = estimate_elevation_m(127.025, 37.498)
        elev_yeoksam_east = estimate_elevation_m(127.035, 37.500)
        assert elev_yeoksam_east > elev_gangnam_west

    def test_slope_calculation_and_classification(self):
        """수평 거리와 고도차에 따른 경사도(%) 및 안심 등급 분류 검증."""
        # 평탄로 (거리 100m, 고도차 1m -> 경사도 1.0%)
        p_flat_1 = [126.9780, 37.5660]
        p_flat_2 = [126.9780, 37.5669]
        slope_flat = calculate_segment_slope_percent(p_flat_1, p_flat_2)
        assert slope_flat < 4.0
        risk_flat = classify_segment_risk(slope_flat, has_stairs=False, surface="dirt", shaded=True)
        assert risk_flat == "safe"

        # 급경사 (8.5% 경사)
        risk_steep = classify_segment_risk(8.5, has_stairs=False, surface="paved", shaded=False)
        assert risk_steep == "caution"

        # 계단 포함 구간은 완만하더라도 caution 부여
        risk_stairs = classify_segment_risk(2.0, has_stairs=True, surface="paved", shaded=True)
        assert risk_stairs == "caution"

        # 보통 경사 (5.5% 경사)
        risk_normal = classify_segment_risk(5.5, has_stairs=False, surface="paved", shaded=False)
        assert risk_normal == "normal"

    def test_route_metrics_aggregation(self):
        """경로 좌표열 전체에 대한 노면/경사/고도 지표 종합 실측 검증."""
        # 덕수궁 돌담길 순환 코스 샘플
        route_coords = [
            [126.9784, 37.5663],
            [126.9752, 37.5663],
            [126.9744, 37.5668],
            [126.9732, 37.5674],
            [126.9715, 37.5680],
            [126.9714, 37.5690],
            [126.9744, 37.5700],
            [126.9784, 37.5663],
        ]
        metrics = evaluate_route_metrics(route_coords)

        assert "max_slope_percent" in metrics
        assert "avg_slope_percent" in metrics
        assert "elevation_min_m" in metrics
        assert "elevation_max_m" in metrics
        assert metrics["elevation_max_m"] >= metrics["elevation_min_m"]
        assert "surface_distribution" in metrics
        assert sum(metrics["surface_distribution"].values()) == pytest.approx(1.0, 0.01)

    def test_segmented_geojson_spatial_continuity_and_properties(self):
        """실데이터 기반 분할 GeoJSON의 3대 안심 등급 속성 및 선분 연속성(Line continuity) 검증."""
        coords = [
            [126.9784, 37.5663],
            [126.9784, 37.5666],
            [126.9770, 37.5671],
            [126.9752, 37.5663],
            [126.9744, 37.5668],
            [126.9732, 37.5674],
            [126.9715, 37.5680],
            [126.9744, 37.5700],
            [126.9784, 37.5663],
        ]

        geojson = build_segmented_geojson(coords, max_slope_hint=4.5)
        assert geojson["type"] == "FeatureCollection"
        features = geojson["features"]
        assert len(features) >= 1

        # 1. 모든 피처의 프로퍼티 정합성 검증
        for feat in features:
            assert feat["type"] == "Feature"
            props = feat["properties"]
            assert props["segmentType"] in {"safe", "normal", "caution"}
            assert isinstance(props["maxSlopePercent"], (int, float))
            assert isinstance(props["shaded"], bool)
            assert "surface" in props

            # LineString 좌표 유효성
            geom = feat["geometry"]
            assert geom["type"] == "LineString"
            assert len(geom["coordinates"]) >= 2

        # 2. 연속성 검증: i번째 세그먼트의 마지막 좌표 == i+1번째 세그먼트의 첫 번째 좌표
        for i in range(len(features) - 1):
            last_pt = features[i]["geometry"]["coordinates"][-1]
            next_first_pt = features[i + 1]["geometry"]["coordinates"][0]
            assert last_pt == next_first_pt, f"세그먼트 {i}와 {i+1} 간의 연결 끊김 발견"

    def test_e2e_agent_segmented_geojson_output(self):
        """에이전트 실행 결과 및 API 연동 시 실측 세그먼트 GeoJSON이 정상 생성되는지 검증."""
        result = run_walk_planning_agent(
            user_query="서울숲에서 20분 동안 관절에 무리 없는 부드러운 산책로 추천해줘",
            client_dog_context={
                "dog_id": "dog_forest",
                "name": "루루",
                "breed": "포메라니안",
                "age_years": 3,
                "weight_kg": 3.2,
                "joint_care_level": 2,
            },
            origin_lat=37.5445,
            origin_lon=127.0375,
        )
        best = result.best_route
        coords = best.geojson_coordinates

        geojson = build_segmented_geojson(coords, max_slope_hint=best.max_slope_percent)
        assert geojson["type"] == "FeatureCollection"
        assert len(geojson["features"]) >= 1

        # 서울숲 평지 산책로의 경우 safe 등급 세그먼트가 최소 1개 이상 존재해야 함
        types = [f["properties"]["segmentType"] for f in geojson["features"]]
        assert "safe" in types
