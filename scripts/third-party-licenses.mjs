/**
 * 배포본(dist)에 포함되는 외부 코드의 라이선스 고지 파일을 만든다.
 * MIT 라이선스는 "저작권 표시와 허락 문구를 모든 복제본에 포함"하도록 요구한다.
 * 설치된 버전의 원본 LICENSE를 그대로 모으므로 버전이 바뀌어도 내용이 어긋나지 않는다.
 *
 * 대상: 런타임 의존성(package.json dependencies)과 그 런타임 하위 의존성, 그리고 Vite가 번들에 넣는
 * 모듈 미리 불러오기 코드(Vite 핵심 라이선스 부분만).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// 경로에 한글이 있어도 깨지지 않도록 fileURLToPath를 쓴다 (URL.pathname은 퍼센트 인코딩됨)
const root = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

function licenseText(name) {
  const dir = join(root, 'node_modules', name)
  const file = readdirSync(dir).find((f) => /^licen[cs]e/i.test(f))
  if (!file) throw new Error(`${name}: LICENSE 파일을 찾지 못했습니다`)
  return readFileSync(join(dir, file), 'utf8').trim()
}

// 런타임 의존성과 그 하위 의존성(react-dom → scheduler 등)을 모은다
const seen = new Map()
function collect(name) {
  if (seen.has(name)) return
  const p = JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8'))
  seen.set(name, p)
  for (const dep of Object.keys(p.dependencies ?? {})) collect(dep)
  // peerDependencies는 우리가 이미 직접 설치한 것(react 등)이라 따로 모으지 않는다
}
for (const name of Object.keys(pkg.dependencies)) collect(name)

const sections = [...seen.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, p]) => `${name} ${p.version} (${p.license})\n${'-'.repeat(60)}\n${licenseText(name)}`)

// Vite: 번들에 들어가는 것은 모듈 미리 불러오기 코드뿐이므로 핵심 라이선스 부분만 넣는다
const viteVersion = JSON.parse(readFileSync(join(root, 'node_modules/vite/package.json'), 'utf8')).version
const viteFull = licenseText('vite')
const viteCore = viteFull.split(/\n#+\s*Licenses of bundled dependencies/i)[0].trim()
sections.push(`vite ${viteVersion} (MIT) — 번들에 포함되는 모듈 미리 불러오기 코드\n${'-'.repeat(60)}\n${viteCore}`)

const header = `사주 명식 (saju-web) — 외부 코드 라이선스 고지
이 웹사이트의 배포 파일에는 아래 오픈소스 코드가 포함되어 있습니다.

`
const outDir = join(root, 'dist')
if (!existsSync(outDir)) throw new Error('dist 폴더가 없습니다. vite build 뒤에 실행하세요.')
writeFileSync(join(outDir, 'THIRD_PARTY_LICENSES.txt'), header + sections.join('\n\n\n') + '\n')
console.log(`라이선스 고지 작성: ${seen.size + 1}개 패키지 → dist/THIRD_PARTY_LICENSES.txt`)
