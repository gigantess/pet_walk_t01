/**
 * [편안하개 - PetWalk]
 * 모바일 데모 및 코스별 GeoJSON/스텝핀 데이터 세트
 * 서울숲 및 인근 주택가 좌표: [lon, lat]
 */

import { RouteFeatureCollection, RouteStepPin } from '../types/route';

/** 코스 1: 편안한 숲길 코스 (서울숲 내부 숲길 루프, 2.8km) */
export const SAMPLE_ROUTE: RouteFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { segmentType: 'safe', maxSlopePercent: 2.1, shaded: true },
      geometry: {
        type: 'LineString',
        coordinates: [
          [127.0374, 37.5443],
          [127.0381, 37.5449],
          [127.039, 37.5455],
          [127.0399, 37.5459],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { segmentType: 'normal', maxSlopePercent: 3.4, shaded: false },
      geometry: {
        type: 'LineString',
        coordinates: [
          [127.0399, 37.5459],
          [127.0409, 37.5456],
          [127.0416, 37.5449],
          [127.0419, 37.5441],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { segmentType: 'caution', maxSlopePercent: 7.8, shaded: false },
      geometry: {
        type: 'LineString',
        coordinates: [
          [127.0419, 37.5441],
          [127.0414, 37.5434],
          [127.0406, 37.543],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { segmentType: 'safe', maxSlopePercent: 1.8, shaded: true },
      geometry: {
        type: 'LineString',
        coordinates: [
          [127.0406, 37.543],
          [127.0396, 37.543],
          [127.0385, 37.5434],
          [127.0374, 37.5443],
        ],
      },
    },
  ],
};

export const SAMPLE_STEP_PINS: readonly RouteStepPin[] = [
  { id: 'turn_1', kind: 'turn', position: [127.0399, 37.5459], instruction: '50m 앞 완만한 길입니다. 우회전하세요' },
  { id: 'turn_2', kind: 'turn', position: [127.0419, 37.5441], instruction: '우측 보행로로 진입하세요' },
  { id: 'caution_1', kind: 'caution', position: [127.0414, 37.5434], instruction: '전방 높은 턱 주의 구간입니다. 서행하세요' },
];

/** 코스 2: 공원 한바퀴 코스 (서울숲 중앙호수 및 거울연못 둘레길, 2.5km) */
export const ROUTE_COURSE_2: RouteFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { segmentType: 'safe', maxSlopePercent: 1.5, shaded: true },
      geometry: {
        type: 'LineString',
        coordinates: [
          [127.0374, 37.5443],
          [127.0385, 37.5435],
          [127.0402, 37.5422],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { segmentType: 'safe', maxSlopePercent: 1.8, shaded: true },
      geometry: {
        type: 'LineString',
        coordinates: [
          [127.0402, 37.5422],
          [127.0425, 37.542],
          [127.044, 37.543],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { segmentType: 'normal', maxSlopePercent: 2.8, shaded: false },
      geometry: {
        type: 'LineString',
        coordinates: [
          [127.044, 37.543],
          [127.0435, 37.545],
          [127.0415, 37.5462],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { segmentType: 'safe', maxSlopePercent: 1.4, shaded: true },
      geometry: {
        type: 'LineString',
        coordinates: [
          [127.0415, 37.5462],
          [127.0392, 37.5455],
          [127.0374, 37.5443],
        ],
      },
    },
  ],
};

export const STEP_PINS_COURSE_2: readonly RouteStepPin[] = [
  { id: 'c2_turn_1', kind: 'turn', position: [127.0402, 37.5422], instruction: '호수변 산책로로 완만하게 좌회전하세요' },
  { id: 'c2_turn_2', kind: 'turn', position: [127.044, 37.543], instruction: '거울연못 쉼터 방면으로 완만히 이동하세요' },
  { id: 'c2_turn_3', kind: 'turn', position: [127.0415, 37.5462], instruction: '잔디광장 방면으로 안전하게 직진하세요' },
];

/** 코스 3: 조용한 주택가 코스 (성수동 한적한 골목길 안심 순환, 2.9km) */
export const ROUTE_COURSE_3: RouteFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { segmentType: 'safe', maxSlopePercent: 1.9, shaded: false },
      geometry: {
        type: 'LineString',
        coordinates: [
          [127.0374, 37.5443],
          [127.036, 37.5455],
          [127.0352, 37.547],
          [127.0358, 37.5485],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { segmentType: 'normal', maxSlopePercent: 2.6, shaded: false },
      geometry: {
        type: 'LineString',
        coordinates: [
          [127.0358, 37.5485],
          [127.0376, 37.5492],
          [127.0395, 37.5488],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { segmentType: 'safe', maxSlopePercent: 3.2, shaded: true },
      geometry: {
        type: 'LineString',
        coordinates: [
          [127.0395, 37.5488],
          [127.0405, 37.5475],
          [127.0398, 37.546],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { segmentType: 'safe', maxSlopePercent: 1.6, shaded: true },
      geometry: {
        type: 'LineString',
        coordinates: [
          [127.0398, 37.546],
          [127.0384, 37.545],
          [127.0374, 37.5443],
        ],
      },
    },
  ],
};

export const STEP_PINS_COURSE_3: readonly RouteStepPin[] = [
  { id: 'c3_turn_1', kind: 'turn', position: [127.0358, 37.5485], instruction: '차량 통행이 적은 골목길로 우회전하세요' },
  { id: 'c3_caution_1', kind: 'caution', position: [127.0395, 37.5488], instruction: '골목 교차로입니다. 좌우를 살피며 서행하세요' },
  { id: 'c3_turn_2', kind: 'turn', position: [127.0398, 37.546], instruction: '서울숲 입구 방면으로 좌회전하세요' },
];

export interface CoursePlanData {
  readonly route: RouteFeatureCollection;
  readonly stepPins: readonly RouteStepPin[];
}

export const COURSE_PLANS: Record<string, CoursePlanData> = {
  course_1: { route: SAMPLE_ROUTE, stepPins: SAMPLE_STEP_PINS },
  course_2: { route: ROUTE_COURSE_2, stepPins: STEP_PINS_COURSE_2 },
  course_3: { route: ROUTE_COURSE_3, stepPins: STEP_PINS_COURSE_3 },
  'candidate-loop-01': { route: SAMPLE_ROUTE, stepPins: SAMPLE_STEP_PINS },
  'candidate-loop-02': { route: ROUTE_COURSE_2, stepPins: STEP_PINS_COURSE_2 },
  'candidate-loop-03': { route: ROUTE_COURSE_3, stepPins: STEP_PINS_COURSE_3 },
};

export function getCoursePlanById(
  courseId?: string,
  fallback?: { route?: RouteFeatureCollection; stepPins?: readonly RouteStepPin[] },
): CoursePlanData {
  if (courseId && COURSE_PLANS[courseId]) {
    return COURSE_PLANS[courseId];
  }
  return {
    route: fallback?.route ?? SAMPLE_ROUTE,
    stepPins: fallback?.stepPins ?? SAMPLE_STEP_PINS,
  };
}
