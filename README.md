# Labs

게임 도구를 모아 둔 사이트입니다. [labs.mongsil.dev](https://labs.mongsil.dev)에서 쓸 수 있습니다.

| 주소 | 게임 | 도구 |
|---|---|---|
| `/er/score` | 이터널 리턴 | 커뮤니티 대회 점수 계산 |
| `/tarkov/players` | Escape from Tarkov | 계정 전적 조회 |
| `/tarkov/kord-breach` | Escape from Tarkov | KORD BREACH 특성 시뮬레이터 |

## 이터널 리턴

### 점수 계산

- 게임에서 내보낸 결과 CSV를 여러 개 한 번에 올리면 경기 순서대로 라운드에 들어갑니다. 같은 경기는 한 번만 들어갑니다.
- 포인트제, 체크포인트, 더블 체크포인트 진행 방식을 고를 수 있고, 순위 점수는 공식 규정을 쓰거나 직접 정할 수 있습니다.
- 처치자 불명 사망과 규정 위반 감점, 동점 처리, 실험체 밴 단계, 서브 날씨 후보를 규정대로 계산합니다.
- 한 대회에 여러 조를 둘 수 있습니다. 조마다 순위표, 방송 화면, 이미지가 따로 나옵니다.
- 참가자는 대회 코드나 링크로 로그인 없이 봅니다. 운영자는 디스코드로 로그인하고, 개최자가 초대 링크로 공동 운영자를 추가합니다.
- 순위표 이미지, 선수 기록 이미지, 순위 CSV로 내보낼 수 있고, OBS 브라우저 소스용 방송 화면 주소가 있습니다. 방송 화면 주소 뒤에 `?top=8&scale=1.5&side=left`처럼 붙이면 표시할 팀 수, 크기, 위치를 바꿀 수 있습니다.
- 대회는 마지막으로 수정한 지 24시간이 지나면 자동으로 지워집니다.

## Escape from Tarkov

### 계정 조회

- 닉네임 앞부분이나 계정 번호로 찾습니다. tarkov.dev에서 한 번 이상 조회된 계정만 찾을 수 있습니다.
- 시즌, PvP, PvE, 아레나 전적을 탭으로 나눠 보여 줍니다. 아레나는 헤드샷 비율, 한 경기 최다 킬, 최고 연속 킬, 모드별 기록까지 나옵니다.
- EFT 모드에는 스캐브 레이드 전적, 스킬 레벨, 무기 숙련, 기록이 갱신될 때 입고 있던 장비도 나옵니다. 시즌 모드에서는 그 계정이 고른 Kord Breach 특성을 보여 주고, 같은 조합을 특성 시뮬레이터에서 열 수 있습니다.
- 시즌 모드에서는 리그 등급과 최고 등급이 나오고, EFT 모드에서는 Kord Breach 배틀패스와 시즌 퀘스트 보상을 얼마나 받았는지 보여 줍니다. 아레나에서는 배틀패스 시즌별 단계가 나옵니다.
- 판정 배지는 플레이 시간과 레이드 수가 비슷한 계정들 사이에서 PMC K/D, 생존율 같은 지표가 어디쯤인지 보여 줍니다. 통계 기준이며 부정행위의 증거가 아닙니다. 계산 방식은 사이트의 판정 기준 페이지에 있습니다.
- 닉네임 변경과 이 사이트에서 받은 전적 기록이 쌓입니다.
- 기록이 오래됐으면 tarkov.dev에서 그 계정을 열고 돌아오면 됩니다. 탭으로 돌아오면 자동으로 다시 불러옵니다.
- 프로필을 열면 그 브라우저에만 최근 본 계정 8개가 남고, 서버로는 보내지 않습니다.

### KORD BREACH 특성 시뮬레이터

시즌 1 Kord Breach 특성으로 빌드를 짜 봅니다. 긍정 특성은 포인트를 쓰고 부정 특성은 포인트를 얻으며, 남은 포인트가 0 아래로 내려가면 부족하다고 표시합니다. 게임에서 함께 고를 수 없는 특성은 고를 수 없고, 어떤 특성 때문인지 카드에 나옵니다. 고른 빌드는 주소에 담겨 그대로 공유할 수 있습니다.

## 실행

Node 24 이상과 pnpm이 필요합니다.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

처음 띄우면 tarkov.dev에서 이름 목록 약 300만 건을 받아 SQLite에 넣습니다. 1분 정도 걸리고 DB는 약 250MB입니다. 받지 않으려면 `JOBS=0`으로 띄웁니다. 디스코드 로그인을 쓰려면 디스코드 앱의 OAuth2 리디렉트 주소에 `{BASE_URL}/auth/callback`을 등록해야 합니다.

```bash
pnpm test    # 대회 계산 엔진, 서버, 프로필 파서, 판정 계산 테스트
pnpm test:ui # 빌드한 서버를 띄워 화면별 가로 넘침, 빠진 스타일, 콘솔 오류 점검
pnpm lint
pnpm build
```

## 설정

| 키 | 설명 |
|---|---|
| `BASE_URL` | 사이트 주소. 로그인 리디렉트, 요청 출처 검사, sitemap에 씁니다 |
| `DISCORD_CLIENT_ID` | 디스코드 앱 Client ID |
| `DISCORD_CLIENT_SECRET` | 디스코드 앱 Client Secret |
| `DATA_DIR` | SQLite 파일을 둘 폴더. 기본값은 `./data` |
| `PLAYERS_BASE` | Tarkov 프로필 JSON을 받을 주소. 기본값은 `https://players.tarkov.dev` |
| `JOBS` | `0`이면 Tarkov 이름 목록 적재와 비교군 수집을 하지 않습니다 |
| `SENTRY_DSN` | 서버 오류를 보낼 Sentry DSN. 비우면 보내지 않습니다 |

## 데이터

### 이터널 리턴

- `src/er/data/characters.json`은 실험체 영문 이름과 한국어 이름 대응표입니다. 새 실험체가 나오면 `ER_API_KEY=... node scripts/er/characters.mjs`로 다시 만듭니다.
- 예시 대회는 2026 KEL 서킷 4 결승의 실제 경기 기록입니다. dak.gg 대회 기록에서 결과 CSV에 담기는 값만 가져왔고, 공식 순위표와 다른 3라운드 1점 차감 두 건은 감점으로 넣었습니다. `node scripts/er/example.mjs`로 다시 만듭니다.

### Escape from Tarkov

- 전적은 [tarkov.dev](https://tarkov.dev)가 공개하는 `players.tarkov.dev` JSON에서 받습니다. 이름 목록은 하루 한 번, 판정 비교군은 최근 30일 안에 갱신된 계정을 초당 1건씩 받습니다. Battlestate Games 서버에는 접속하지 않습니다.
- `src/tarkov/data/levels.json`, `src/tarkov/data/achievements.json`, `src/tarkov/data/season.json`은 tarkov.dev JSON API의 레벨 표, 업적, 시즌 특성입니다. 특성의 이름, 효과, 포인트, 함께 고를 수 없는 관계는 게임 데이터의 한국어 번역 그대로입니다. `pnpm refdata`로 다시 만들고, 이때 특성 아이콘은 `public/kord/perks`에, 업적, 스킬 아이콘과 레벨, 프레스티지 배지는 `public/img`에 받습니다. 장비와 무기 아이콘은 종류가 많아 화면에서 처음 쓰일 때 서버가 받아 데이터 폴더의 `icons`에 둡니다. 아이콘을 줄이는 데 macOS `sips`를 씁니다.
- 리그 등급 이름과 아레나 배틀패스 시즌별 단계 수는 `src/tarkov/lib/season.ts`에 직접 적었습니다. 등급 이름은 게임 한국어 데이터의 등급 보상 부조 이름과 리그 업적 문구에서, 단계 수와 시작일은 [Escape from Tarkov 위키](https://escapefromtarkov.fandom.com/wiki/Arena_BattlePass)에서 가져왔습니다. 새 아레나 시즌이 열리면 이 표에 추가합니다.
- `test/tarkov/fixtures`는 실제 프로필 세 개에서 장비와 아이템을 빼고 닉네임과 계정 번호를 바꾼 것입니다. 1001 계정의 리그 최고 등급, 배틀패스, 시즌 퀘스트 보상 값은 화면 테스트를 위해 넣은 값입니다.
- 계정 주인이 삭제를 요청하면 `node scripts/tarkov/hide.mjs <계정 번호>`로 기록을 지우고 이후 표시하지 않습니다.

글꼴은 [Pretendard](https://github.com/orioncactus/pretendard)이며 SIL Open Font License를 따릅니다.
