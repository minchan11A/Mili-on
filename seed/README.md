# 밀라인드 시드 데이터

밀라인드 앱이 시연 모드에서 그대로 읽고, 서버 모드에서는 `prisma/seed.ts`로 DB에 넣는 시드 데이터입니다.
데이터 기준일은 2026-10-11이고, 최근 12개월(2025-10-12 ~ 2026-10-11) 데이터를 담았습니다.

**객관적 근거가 있는 부분**과 **가상인 부분**을 구분했습니다.

| 구분 | 내용 | 근거 |
| --- | --- | --- |
| 실제 데이터 | 훈련장 목록·주소·유형 (국방부 CSV를 변환하는 경우) | 국방부_예비군 훈련장 정보 (공공데이터포털) |
| 실제 데이터 | 시도·시군구 경계와 중심 좌표 | 통계청 센서스용 행정구역경계 2013 |
| 실제 통계를 반영한 분포 | 제안 카테고리 비중 (가정치 15% 포함) | 국민권익위원회 예비군 민원 분석 (2023) |
| 실제 통계를 반영한 분포 | 4~5월 비중 34.8% | 권익위 2020~2022 민원 20,284건 분석 |
| 실제 내용 | 개선 사례 6건 (상태: "권익위 권고") | 권익위 제도 개선 권고 (2023.7) |
| 가상 | 사용자, 이수 기록, 만족도 점수, 후기, 제안 문장, 가이드, Q&A, 개선 사례 4건 | 언론 보도 민원 유형을 참고해 새로 작성 |

출처 링크와 수치는 `reference/sources.json`에 모두 정리했습니다.

---

## 폴더 구성

```
milind-seed/
├─ data/demo/                ← 앱이 읽는 결과물 (바로 사용)
│  ├─ ranges.json            훈련장 24곳 (가명, 시군구 중심 좌표)
│  ├─ users.json             예비군 200 + 시연 사용자 1 + 훈련장 담당자 24 + 정책 담당자 1
│  ├─ training-records.json  이수 기록 (평가 자격 판단용)
│  ├─ reviews.json           만족도 평가 (5개 지표, 1~5점)
│  ├─ proposals.json         개선 제안 300건
│  ├─ proposal-empathies.json  공감
│  ├─ status-history.json    처리 상태 이력
│  ├─ official-replies.json  훈련장 공식 답변
│  ├─ issues.json            이슈 묶음 (우선순위 점수 포함, 점수 높은 순)
│  ├─ best-practices.json    개선 사례 10건 (권고 6 + 가상 4)
│  ├─ guides.json            훈련장 가이드
│  ├─ questions.json, answers.json   Q&A (AI 답변 + 근거 가이드 id)
│  ├─ meta.json              생성 정보, 건수, 고지 문구
│  └─ csv/                   ranges·reviews·proposals·issues 엑셀 확인용 (UTF-8 BOM)
├─ geo/
│  ├─ korea-sido.geo.json    시도 경계 (지도 그리기용)
│  ├─ korea-sigungu.geo.json 시군구 경계 (지도 확대용)
│  └─ sigungu_centroids.csv  시군구 중심 좌표 263행 (구가 나뉜 시는 시 단위 행 추가)
├─ config/                   분포·설정 (숫자를 바꾸고 다시 생성 가능)
│  ├─ category_distribution.csv   카테고리 목표 비중 + 근거
│  ├─ monthly_weights.csv         월별 가중치 + 근거
│  ├─ subtopics.csv               카테고리별 세부 주제와 비중, 안전 관련 여부
│  └─ ranges_demo.csv             가명 훈련장 24곳과 시나리오 역할
├─ templates/                문장 템플릿 (자유롭게 추가·수정)
│  ├─ proposal_templates.csv      제안 제목·본문 83개
│  ├─ mask_inserts.csv            마스킹 시연용 삽입 문장 (가상 단대호·인물·전화번호, 어울리는 카테고리 지정)
│  ├─ review_comment_templates.csv
│  ├─ guide_templates.csv
│  └─ qna_templates.csv
├─ reference/
│  ├─ sources.json                출처와 수치, 가정 목록
│  └─ best_practices_basis.json   개선 사례 원본
└─ scripts/
   ├─ generate_seed.py       시드 생성 (외부 패키지 없음, 고정 난수)
   ├─ validate_seed.py       설계 조건 검사
   ├─ convert_mnd_ranges.py  국방부 CSV → 실제 훈련장 시드
   ├─ geo_lookup.py          시도·시군구 → 좌표 (행정구역 명칭 변경 보정)
   └─ build_centroids.py     경계 GeoJSON → 중심 좌표 CSV
```

---

## 실행 방법

Python 3.9 이상이면 됩니다. 설치할 패키지는 없습니다.

```bash
python3 scripts/generate_seed.py      # data/demo/ 다시 생성
python3 scripts/validate_seed.py      # 13개 조건 검사 (모두 PASS여야 함)
```

같은 설정이면 항상 같은 결과가 나옵니다. `config/`나 `templates/`를 고친 뒤 다시 실행하세요.

### 실제 훈련장 목록으로 바꾸기

1. [국방부_예비군 훈련장 정보](https://www.data.go.kr/dcat/metadata/15050550)에서 CSV를 내려받습니다.
2. 변환합니다. 인코딩(UTF-8, CP949)은 자동으로 판별합니다.
   ```bash
   python3 scripts/convert_mnd_ranges.py 내려받은파일.csv
   ```
   결과는 `data/ranges_real.json`에 저장되고, 좌표를 못 찾은 행은 `data/ranges_unmatched.csv`에 따로 모입니다. 이 파일은 꼭 열어 보세요.
3. 실제 목록으로 시드를 만듭니다.
   ```bash
   python3 scripts/generate_seed.py --real-ranges data/ranges_real.json
   ```

이 모드에서는 **실제 훈련장은 지표 점수를 3.4~3.9 사이로만** 만듭니다. 실제 훈련장이 가상 점수 때문에 나쁘게 보이지 않게 하기 위해서입니다.
문제가 드러나는 시연 장면은 가명 훈련장 4곳(A·D·H·K)이 맡습니다. 이 4곳은 `isFictional: true`로 표시돼 있어요.

---

## 시나리오가 데이터에 들어 있는 방식

`validate_seed.py`가 아래 조건을 확인합니다.

- **우선순위 1위 이슈**: "식사·급식 · 배식 대기시간"
- **급증 알림**: 최근 4주 식사·급식 제안이 이전 12주 주평균의 4.0배 (기준 1.8배)
- **A훈련장(경기 양주시)**: 식사 평균 2.6점. 배식 대기시간 제안 8건이 모두 미처리 상태라 시연에서 담당자가 처리할 수 있음
- **개선 후 점수 상승**: D훈련장 식사(배식구 증설), H훈련장 교통(셔틀 시간 조정), K훈련장 시설(이동식 화장실). 개선 사례 카드와 연결됨
- **산간 훈련장(E·F·G 등)**: 교통 점수가 낮아 지도에서 지역 패턴이 보임
- **"평가 부족" 예시**: X훈련장(세종)은 평가가 5건 미만으로 나오도록 고정
- **마스킹 대상 포함 제안**: 45건. `maskExpected`에 기대 유형이 들어 있음
- **시연 사용자 `usr_demo`**: 7일 전 A훈련장 이수, 아직 평가 전이라 평가 작성 시연 가능

카테고리 비중은 급증분 14건이 더해져 식사·급식이 24%로 가장 높게 나옵니다. 급증분을 빼면 권익위 비율에 맞춰집니다.

---

## 앱에 연결할 때 (개발 명세서와 달라진 점)

개발 명세서 4장 Prisma 스키마에 아래 필드를 추가해 주세요.

| 모델 | 추가·변경 | 이유 |
| --- | --- | --- |
| TrainingRange | `isFictional Boolean`, `source String`, `setting String?`, `address String?`, `phone String?` | 실제/가명 구분, 국방부 데이터 필드 |
| Proposal | `subtopic String`, `maskExpected String[]` | 이슈 묶음 기준, 마스킹 테스트용 기대값 |
| BestPractice | `rangeId`를 선택 항목으로, `basis`, `basisLabel`, `sourceId`, `recommendedAt` 추가, `completedAt`을 선택 항목으로 | 권익위 권고는 특정 훈련장·완료일이 없음 |
| Issue | `proposalCount`, `empathyCount`, `rangeCount` | 화면 표시용 캐시 값 (DB에서는 계산해도 됨) |

그 밖에 알아둘 점:

- **제안 본문(`body`)은 마스킹 전 원문입니다.** 마스킹 엔진 시연과 테스트에 쓰려고 일부러 원문으로 두었습니다. 앱은 저장하거나 화면에 보여줄 때 `maskText`를 적용해야 합니다. 들어 있는 단대호, 인물, 전화번호는 모두 가상입니다(예: 제987사단, 김예비 중사, 010-1234-5678).
- **로그인 ID**: `demo`(시연 예비군), `manager_ra01`(A훈련장 담당자), `policy`(정책 담당자), `reservist001`~`reservist200`. 비밀번호는 `prisma/seed.ts`에서 정해 해시로 저장하세요.
- **날짜**는 모두 KST(+09:00) ISO 문자열입니다.
- **AI 대책 캐시(`data/demo/ai-cache/`)는 들어 있지 않습니다.** 앱의 `scripts/build-ai-cache.ts`로 상용 AI를 실제로 호출해 만든 뒤 사람이 검수해야 합니다(명세서 8.2).
- **경계 데이터는 2013년 기준**입니다. 군위군 대구 편입, 강원·전북 특별자치도 명칭 같은 변경은 `geo_lookup.py`가 보정합니다. 실서비스에서는 최신 SGIS 경계로 바꾸는 걸 권장합니다.
- 화면에는 항상 "예시 데이터" 고지를 표시하세요. `meta.json`의 `notice`를 그대로 쓰면 됩니다.
