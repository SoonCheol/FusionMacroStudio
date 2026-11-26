# Fusion Macro Studio
Fusion 360 전용 12키·3노브 매크로 키보드 정적 웹 편집기.
GitHub Pages: https://sooncheol.github.io/FusionMacroStudio/ (배포 설정/성공 확인 필요).
USB 514C:8842 전용. Chrome/Edge HTTPS에서 연결. Fusion 애드인은 별도 ZIP 설치 프로그램으로 구현(실기 미검증).
현재 v0.3.1: 메뉴 기반 명령 탐색, 드래그 매핑, 다크/라이트, JSON, 원본 PNG 폴더 불러오기, 제한된 HID 단일 키 읽기/쓰기. 실제 키보드 검증 전. 전체 원본 프로필 복원 아직 미지원. 애드인은 프로필을 로컬로 가져오며 실제 Fusion 실행 검증 필요.
개발 지침 AGENTS.md, 상태 docs/CURRENT-STATUS.md, 출처 docs/SOURCES.md.

원본 PNG·가져온 카탈로그·미전송 변경은 브라우저에 로컬 보관. 장치 전체 읽기 후 원본 백업을 별도로 내려받을 수 있음.

쓰기 직전 원본 백업 저장. Actions의 validate 성공 시 웹/설치 패키지 아티팩트도 제공 (Pages 활성화와 별개).

웹 기본 아이콘은 독자 제작 CAD 벡터(핵심 개별, 기능군 공유). 로컬 원본 PNG가 우선. icons.html에서 메뉴 아이콘을 검토할 수 있음.
