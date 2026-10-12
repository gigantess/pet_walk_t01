# Member D 외장 활동 및 인프라 매뉴얼: Frontend & Mobile App Lead

## 1. 개요
본 문서는 Member D(Frontend & Mobile App Lead)가 AI 어시스턴트에 위임할 수 없는 **Expo 계정 생성, EAS(Expo Application Services) 클라우드 빌드 환경 설정, Google Maps Android SDK 인증키 발급 및 서명 지문(SHA-1) 등록, Android 실기기 개발자 모드 설정, EAS Update(무선 OTA) 배포 파이프라인 수동 운영 절차**를 규정합니다.

---

## 2. Expo 계정 생성 및 EAS CLI 로컬 환경 세팅

AI 도구는 브라우저를 통한 계정 가입 및 터미널 2차 인증(2FA)을 직접 수행할 수 없으므로, Member D가 수동으로 완료해야 합니다.

### 2.1 Expo 계정 및 Organization 설정
1. **사이트 접속**: [expo.dev](https://expo.dev/) 접속 및 회원가입 (`pawtrail-dev`).
2. **Organization 생성**:
   - 팀 단위 관리를 위해 `pawtrail-team` Organization 생성.
   - 프로젝트명: `pawtrail-mobile`
3. **EAS CLI 설치 및 로그인 (로컬 터미널)**:
   ```bash
   npm install -g eas-cli
   eas login
   # 브라우저 또는 터미널 프롬프트에서 아이디/비밀번호 수동 입력
   ```
4. **프로젝트 연동 (초기화)**:
   ```bash
   cd frontend
   eas init --id <자동생성_PROJECT_ID>
   ```

---

## 3. Google Cloud Console: Android Maps SDK API 키 발급 및 SHA-1 등록

React Native 모바일 지도(`react-native-maps`)가 Android 실기기에서 정상 작동하기 위해서는 Google Cloud Console에서 Android 지문(SHA-1)을 등록해야 지도가 회색 화면으로 깨지지 않습니다.

### 3.1 Android Maps SDK 활성화
1. Google Cloud Console ➔ 앞서 Member A가 만든 `pawtrail-production` 프로젝트 선택.
2. **"API 및 서비스" ➔ "라이브러리"** 이동.
3. `Maps SDK for Android` 검색 후 **[사용(Enable)]** 클릭.

### 3.2 디버그/릴리즈 SHA-1 인증서 지문 추출
로컬 디버그용 및 EAS 빌드용 키스토어에서 지문을 추출합니다.
```bash
# 로컬 개발용 debug.keystore 지문 확인
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
# 출력된 Certificate fingerprints: SHA1: 1A:2B:3C:... 복사
```

### 3.3 API 키 생성 및 애플리케이션 제한(Application Restrictions) 설정
1. API 및 서비스 ➔ **사용자 인증 정보(Credentials)** ➔ **[+ 사용자 인증 정보 만들기] ➔ [API 키]**.
2. 키 이름: `PawTrail_Android_Maps_Key`
3. **애플리케이션 제한사항 설정**:
   - [x] `Android 앱` 선택.
   - 패키지 이름 추가: `com.pawtrail.app`
   - SHA-1 인증서 지문: 위에서 복사한 로컬 SHA-1 및 EAS 빌드 서버 SHA-1 등록.
4. **API 제한사항 설정**:
   - [x] `키 제한` 선택 ➔ `Maps SDK for Android`만 선택.
5. 발급된 키를 `app.json`에 주입:
   ```json
   {
     "expo": {
       "android": {
         "package": "com.pawtrail.app",
         "config": {
           "googleMaps": {
             "apiKey": "AIzaSy..."
           }
         }
       }
     }
   }
   ```

---

## 4. Android 실기기(Physical Device) 테스트 환경 구축

백그라운드 위치 추적(`Location.startLocationUpdatesAsync`)과 화면 꺼짐 상태의 음성 안내(`expo-speech`)는 안드로이드 에뮬레이터에서 배터리 절전 모드를 완벽히 재현하기 어려우므로 실기기 설정이 필수입니다.

### 4.1 스마트폰 개발자 모드 및 USB 디버깅 활성화
1. Android 스마트폰 설정 ➔ **휴대전화 정보 ➔ 소프트웨어 정보**.
2. **"빌드번호"** 항목을 연속으로 7회 탭 ➔ "개발자 모드가 켜졌습니다" 확인.
3. 설정 ➔ **개발자 옵션** 진입.
4. **[USB 디버깅]** 활성화(ON).
5. 스마트폰을 PC에 USB 연결 ➔ 팝업에서 "이 컴퓨터에서 항상 허용" 체크 후 [확인].

### 4.2 배터리 최적화 제외 수동 설정 (백그라운드 포그라운드 서비스 유지)
1. 스마트폰 설정 ➔ **애플리케이션 ➔ PawTrail 앱** 선택.
2. **배터리** 메뉴 진입.
3. 기본값인 "최적화됨"에서 **"제한 없음(Unrestricted)"**으로 변경.
4. 위치 권한: **"항상 허용(Allow all the time)"**으로 수동 설정.

---

## 5. EAS Build (APK 생성) 및 무선 OTA 배포 (EAS Update)

### 5.1 사내 테스트용 독립 APK 빌드 (Development / Preview Build)
에뮬레이터가 없는 팀원(Member A, E)에게 배포하기 위한 Standalone APK 파일 생성:
```bash
# eas.json의 preview 프로파일 빌드 (APK 파일 생성)
eas build -p android --profile preview

# 빌드 완료 후 콘솔에 출력되는 다운로드 URL을 슬랙 팀 채널에 공유
# 팀원 스마트폰에서 직접 APK 다운로드 및 "출처를 알 수 없는 앱 설치" 허용 후 설치
```

### 5.2 EAS Update(무선 무중단 배포) 실시간 반영
스마트폰에 앱이 이미 설치된 상태에서 JS/UI 코드 및 로직을 즉시 무선으로 갱신:
```bash
# preview 채널로 실시간 코드 푸시 (앱 재빌드 없이 수초 내 반영)
eas update --branch preview --message "Member E 디자인 시스템 고대비 토큰 반영"
```

### 5.3 로컬-퍼스트 AsyncStorage 백업 테스트
1. 팀원 기기에서 산책 경로 2~3회 기록.
2. 기기 내 `설정 ➔ 산책 기록 백업` 버튼 탭 ➔ `pawtrail_backup.json` 파일이 로컬 다운로드 폴더에 정상 익스포트되는지 확인.
3. 앱 삭제 후 재설치 ➔ 백업 파일 복원 시 반려견 프로필 및 경로가 100% 복구되는지 수동 검증.
