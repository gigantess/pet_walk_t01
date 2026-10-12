# Member C 외장 활동 및 인프라 매뉴얼: Backend & Spatial Routing Lead

## 1. 개요
본 문서는 Member C(Backend & Spatial Routing Lead)가 AI 어시스턴트에 위임할 수 없는 **Supabase 클라우드 데이터베이스 프로비저닝, PostGIS 확장 기능 활성화, OpenRouteService(ORS) 인증키 확보, 백엔드 클라우드 호스팅 인프라 구축 및 SSL/CORS 환경설정 절차**를 규정합니다.

---

## 2. Supabase Cloud 인프라 구축 및 PostGIS 설정

PawTrail은 공간 지리 인덱싱(Spatial Query)과 경량 커뮤니티 데이터 처리를 위해 Supabase의 PostgreSQL 엔진을 활용합니다.

### 2.1 Supabase 프로젝트 생성
1. **Supabase 접속**: [supabase.com](https://supabase.com/) 접속 및 GitHub 계정으로 로그인.
2. **New Project 생성**:
   - Organization: 팀 공용 조직 선택.
   - Name: `pawtrail-backend`
   - Database Password: 16자리 이상의 강력한 난수 암호 생성 후 팀 키스토어에 보관.
   - Region: **Northeast (Seoul) - ap-northeast-2** 선택 (지연시간 최소화 필수).
   - Pricing Plan: Free Tier (또는 Pro Tier).

### 2.2 PostGIS 확장 기능(Extension) 수동 활성화
PostGIS는 AI 도구가 콘솔 대신 켤 수 없으므로, 대시보드에서 직접 활성화해야 합니다.
1. Supabase 대시보드 ➔ 좌측 메뉴 **"Database" ➔ "Extensions"** 클릭.
2. 검색창에 `postgis` 검색.
3. `postgis: PostGIS geometry and geography spatial types and functions` 항목의 토글 스위치를 **ON**으로 전환.
4. (선택) `postgis_raster`도 필요 시 활성화.
5. **SQL Editor에서 활성화 검증**:
   ```sql
   SELECT PostGIS_Version();
   -- 출력 결과: "3.3 USE_GEOS=1 USE_PROJ=1 USE_STATS=1" 등이 정상 반환되는지 확인
   ```

### 2.3 Row Level Security (RLS) 및 커뮤니티 테이블 정책 수동 적용
1. SQL Editor를 열고 커뮤니티 산책로 공유 테이블에 대한 접근 정책을 실행:
   ```sql
   -- RLS 활성화
   ALTER TABLE public.community_routes ENABLE ROW LEVEL SECURITY;

   -- 읽기 권한: 모든 인증/익명 사용자 허용 (공개 피드)
   CREATE POLICY "Allow public read access" 
   ON public.community_routes FOR SELECT USING (true);

   -- 쓰기 권한: 인증된 사용자만 생성 허용
   CREATE POLICY "Allow authenticated insert" 
   ON public.community_routes FOR INSERT 
   TO authenticated WITH CHECK (auth.uid() = user_id);
   ```

---

## 3. 외부 공간 라우팅(Routing) 서비스 API 키 발급

보행자 및 반려동물 보행 네트워크 계산을 위한 OpenRouteService 계정을 발급받습니다.

### 3.1 OpenRouteService(ORS) 계정 발급
1. [openrouteservice.org/dev](https://openrouteservice.org/dev/#/signup) 접속.
2. 무료 개발자 계정 등록 후 이메일 인증.
3. **API Key 토큰 발급**:
   - Token Name: `PawTrail_Backend_Dev`
   - Service: Standard Free Plan (일 2,000 요청, 분당 40 요청).
4. 발급된 `ORS_API_KEY`를 안전하게 복사.

### 3.2 로컬 OSRM 도커 백업 인프라 (선택/폴백용)
ORS 쿼터 초과 시를 대비하여 로컬/자체 호스팅 OSRM 인프라 준비:
```bash
# 한국(수도권) OSM PBF 데이터 다운로드
wget https://download.geofabrik.de/asia/south-korea-latest.osm.pbf

# OSRM 보행자 프로파일 전처리 (수작업)
docker run -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/foot.lua /data/south-korea-latest.osm.pbf
docker run -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend osrm-partition /data/south-korea-latest.osrm
docker run -t -v $(pwd):/data ghcr.io/project-osrm/osrm-backend osrm-customize /data/south-korea-latest.osrm

# OSRM 라우팅 데몬 기동 (포트 5000)
docker run -d -p 5000:5000 -v $(pwd):/data ghcr.io/project-osrm/osrm-backend osrm-routed --algorithm mld /data/south-korea-latest.osrm
```

---

## 4. 백엔드 클라우드 호스팅 인프라 구축 (Render / Railway)

FastAPI 애플리케이션을 인터넷망에 안전하게 배포하고 SSL 인증서를 연동합니다.

### 4.1 Cloud PaaS 인스턴스 프로비저닝 (예: Render.com)
1. Render.com 접속 ➔ **New Web Service** 선택.
2. GitHub 저장소 연동 (`pawtrail/backend` 루트 지정).
3. **기본 런타임 설정**:
   - Environment: `Python 3`
   - Region: `Singapore` 또는 `Tokyo` (한국 인접 지역)
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2`
4. **Environment Variables(환경 변수) 수동 등록**:
   - `GEMINI_API_KEY`: (Member A가 제공한 키)
   - `SUPABASE_URL`: `https://your-project.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: `eyJh...`
   - `ORS_API_KEY`: (ORS에서 발급한 키)
   - `ALLOWED_ORIGINS`: `*` (개발 초기) 또는 모바일 클라이언트 도메인

### 4.2 도메인 연결 및 SSL(HTTPS) 활성화
- 기본 제공되는 `https://pawtrail-api.onrender.com` 도메인 상태 확인.
- 자동 갱신 Let's Encrypt SSL 인증서 정상 발급 여부 확인 (모바일 앱의 HTTPS 필수 요건 충족).

---

## 5. 서버 헬스체크 및 백업/보안 유지보수

1. **UptimeRobot 모니터링 연동**:
   - [uptimerobot.com](https://uptimerobot.com/)에 `/api/v1/health` 엔드포인트를 5분 주기로 등록.
   - 서버 다운타임 발생 시 Member C의 휴대폰 SMS 및 슬랙으로 즉시 긴급 알림(Webhook).
2. **PostgreSQL 수동 주간 백업**:
   - Supabase 콘솔 ➔ Database ➔ Backups 탭에서 일일 자동 스냅샷 상태 점검.
