# ER Labs

이터널 리턴 도구를 모아 둔 비공식 사이트입니다. 지금은 커스텀 게임 결과 CSV로 커뮤니티 대회 순위를 계산하는 점수 계산기가 있습니다. [er.mongsil.dev](https://er.mongsil.dev)에서 쓸 수 있습니다.

## 기능

- 게임에서 내보낸 결과 CSV를 여러 개 한 번에 올리면 경기 순서대로 라운드에 들어갑니다. 같은 경기는 한 번만 들어갑니다.
- 포인트제, 체크포인트, 더블 체크포인트 진행 방식을 고를 수 있고, 순위 점수는 공식 규정을 쓰거나 직접 정할 수 있습니다.
- 처치자 불명 사망과 규정 위반 감점, 동점 처리, 실험체 밴 단계, 서브 날씨 후보를 규정대로 계산합니다.
- 한 대회에 여러 조를 둘 수 있습니다. 조마다 순위표, 방송 화면, 이미지가 따로 나옵니다.
- 참가자는 대회 코드나 링크로 로그인 없이 봅니다. 운영자는 디스코드로 로그인하고, 개최자가 초대 링크로 공동 운영자를 추가합니다.
- 순위표 이미지, 선수 기록 이미지, 순위 CSV로 내보낼 수 있고, OBS 브라우저 소스용 방송 화면 주소가 있습니다. 방송 화면 주소 뒤에 `?top=8&scale=1.5&side=left`처럼 붙이면 표시할 팀 수, 크기, 위치를 바꿀 수 있습니다.
- 대회는 마지막으로 수정한 지 24시간이 지나면 자동으로 지워집니다.

## 실행

Node 24 이상과 pnpm이 필요합니다.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

디스코드 로그인을 쓰려면 디스코드 앱의 OAuth2 리디렉트 주소에 `{BASE_URL}/auth/callback`을 등록해야 합니다.

```bash
pnpm test    # 계산 엔진과 서버 테스트
pnpm lint
pnpm build
```

## 설정

| 키 | 설명 |
|---|---|
| `BASE_URL` | 사이트 주소. 로그인 리디렉트와 요청 출처 검사에 씁니다 |
| `DISCORD_CLIENT_ID` | 디스코드 앱 Client ID |
| `DISCORD_CLIENT_SECRET` | 디스코드 앱 Client Secret |
| `DATA_DIR` | SQLite 파일을 둘 폴더. 기본값은 `./data` |

## 데이터

- `src/data/characters.json`은 실험체 영문 이름과 한국어 이름 대응표입니다. 새 실험체가 나오면 `ER_API_KEY=... node scripts/characters.mjs`로 다시 만듭니다.
- 예시 대회는 2026 KEL 서킷 4 결승의 실제 경기 기록입니다. dak.gg 대회 기록에서 결과 CSV에 담기는 값만 가져왔고, 공식 순위표와 다른 3라운드 1점 차감 두 건은 감점으로 넣었습니다. `node scripts/example.mjs`로 다시 만듭니다.
- 글꼴은 [Pretendard](https://github.com/orioncactus/pretendard)이며 SIL Open Font License를 따릅니다.
