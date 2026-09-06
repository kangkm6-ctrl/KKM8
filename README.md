# 명함 스캐너 프록시 서버 (Gemini 버전 · 무료)

Google Gemini API를 서버에서만 호출해서, 진짜 API 키가 클라이언트 코드에 노출되지 않게 합니다.
(기존 KIS Open API 프록시, kkm-mwrc.onrender.com 과 같은 구조)

## 1. Gemini API 키 발급 (무료, 카드 등록 불필요)

1. **aistudio.google.com** 접속 → 구글 계정으로 로그인
2. 왼쪽 메뉴 또는 상단에서 **Get API key** 클릭
3. **Create API key** 클릭 → 키가 생성됨 (`AIza...`로 시작)
4. 이 키를 메모해두세요. 무료 등급은 신용카드 등록 없이 바로 사용 가능합니다 (요청 빈도 제한만 있음).

## 2. Render.com 배포

1. 이 폴더(`card-scanner-proxy/`)를 GitHub 저장소에 올립니다.
2. Render 대시보드 → New → Web Service → 해당 저장소 선택
3. 설정
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: Free
4. Environment 탭에서 환경변수 추가
   - `GEMINI_API_KEY` : 1번에서 발급받은 키
   - `APP_SECRET` : 아무 문자열 (예: `sh-card-2026`) — 최소한의 오남용 방지용
5. 배포 완료 후 `https://your-service-name.onrender.com` 주소 확인

## 3. PWA 쪽 설정

`index.html`은 이미 이 프록시를 호출하도록 되어 있어서 **바꿀 게 없습니다.**
(Anthropic → Gemini로 바뀐 건 서버 내부 구현만 바뀐 것이라, 앱은 그대로 `PROXY_URL`, `APP_SECRET`만 본인 값으로 맞춰두면 됩니다.)

```js
const PROXY_URL = 'https://your-service-name.onrender.com/scan-card';
const APP_SECRET = 'sh-card-2026'; // Render에 넣은 APP_SECRET과 동일해야 함
```

## 참고

- Gemini API 무료 등급은 분당 요청 수 제한이 있습니다. 명함을 한 번에 여러 장 연속으로 스캔하면 잠깐 대기가 필요할 수 있어요.
- 무료 Render 인스턴스는 오래 안 쓰면 잠들었다가 첫 요청 때 10~30초 정도 깨어나는 시간이 걸립니다. UptimeRobot으로 깨워두면 항상 빠릅니다.
- `APP_SECRET`은 완벽한 보안이 아니라 최소한의 오남용 방지 장치입니다. 진짜 키는 `GEMINI_API_KEY`이고, 서버 환경변수에만 있습니다.
