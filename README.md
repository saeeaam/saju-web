# saju-web

사주(명리학)와 자미두수 명반을 계산해 보여주는 정적 웹앱. 계산은 모두 브라우저에서 수행하며 생년월일시를 서버로 보내지 않는다.

배포 주소: https://saeeaam.github.io/saju-web/

## 스택

TypeScript, Vite, React, Vitest

## 명령어

- `npm run dev` 개발 서버
- `npm test` 테스트 실행 (`npm run test:watch` 감시 모드)
- `npm run typecheck` 타입 검사
- `npm run build` 타입 검사 + 프로덕션 빌드
- `npm run lint` 린트

## 구조

- `src/data/` 계산에 쓰는 상수 JSON(천간·지지·지장간·십성·12운성·납음·신살·자미두수)과 로더, 무결성 테스트
- `src/types/` 입력·옵션·기본 타입. 옵션 기본값은 `src/types/options.ts`
- `src/core/` 명식 계산(4주·십성·12운성·대운 등), 명리 분석(관계·강약·용신 후보·신살·해석), 자미두수 명반(`ziwei.ts`). 교차 검증은 `crosscheck.test.ts`(만세력), `ziwei-crosscheck.test.ts`(iztro)
- `src/ui/` 화면 컴포넌트 (Phase 2 이후)

## 문서

규칙·근거 문서는 상위 폴더(`../`)의 `YYMMDD_*.md`에 있다. 작업 계획은 `../261110_사주 웹페이지 작업 계획.md`.
데이터 JSON의 `_note`에 출처와 검증 상태를 적어 두었다. 값이 바뀌면 문서와 함께 갱신한다.

## 배포

`main`에 푸시하면 GitHub Actions(`.github/workflows/deploy.yml`)가 타입 검사·린트·테스트를 모두 통과한 경우에만 빌드해 GitHub Pages에 올린다.
빌드할 때 `scripts/third-party-licenses.mjs`가 배포본에 포함되는 오픈소스의 라이선스 고지(`THIRD_PARTY_LICENSES.txt`)를 만든다.

## 라이선스 고지

배포본에는 React, React DOM, scheduler, manseryeok(모두 MIT)와 Vite의 모듈 미리 불러오기 코드(MIT)가 포함된다.
교차 검증에만 쓰는 lunar-javascript, @fullstackfamily/manseryeok, iztro(모두 MIT)는 배포본에 포함되지 않는다.
