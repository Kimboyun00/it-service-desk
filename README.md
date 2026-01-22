# IT Service Desk

대학/공공기관 전산팀용 티켓 관리 시스템입니다.  
요청 접수, 처리/배정, 댓글, 첨부파일, 알림(메일/앱)을 중심으로 구성되어 있습니다.

---

## Tech Stack

### Backend
- FastAPI
- SQLAlchemy 2.x
- Alembic
- PostgreSQL

### Frontend
- Next.js 16
- React 19
- Tailwind CSS

### Infra / DevOps
- Docker / Docker Compose
- NCP Object Storage (S3 호환, Presigned URL)
- SMTP (내부 SMTP, port 25)

---

## 프로젝트 구조

```
.
├─ infra/
│  ├─ docker-compose.yml
│  ├─ .env
│  └─ .env.example
├─ apps/
│  ├─ api/
│  │  ├─ app/
│  │  │  ├─ core/
│  │  │  ├─ models/
│  │  │  ├─ routers/
│  │  │  └─ services/
│  │  ├─ alembic/
│  │  ├─ alembic.ini
│  │  └─ Dockerfile
│  └─ web/
│     ├─ app/
│     ├─ components/
│     └─ public/
└─ README.md
```

---

## 환경 변수 설정

### 1) infra/.env
Docker Compose 실행 시 사용됩니다.  
템플릿: `infra/.env.example`

필수 항목 예시:
- `NEXT_PUBLIC_API_BASE_URL` : 웹이 호출할 API 기본 URL  
  예) `http://localhost:8000`
- `DATABASE_URL` : API DB 연결 문자열
- `STORAGE_BACKEND` : `local` 또는 `object`
- `OBJECT_STORAGE_*` : Object Storage 사용 시 필요
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`
- `APP_BASE_URL` : 메일/링크에 사용할 웹 주소

### 2) apps/api/.env
API 런타임에서 사용됩니다.  
템플릿: `apps/api/.env.example`

필수 항목 예시:
- `DATABASE_URL`
- `JWT_SECRET`, `JWT_EXPIRES_MIN`
- `CORS_ORIGINS`
- `STORAGE_BACKEND` / `LOCAL_UPLOAD_ROOT` / `OBJECT_STORAGE_*`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `APP_BASE_URL`

---

## 로컬 실행 (Docker Compose)

```
cd infra
docker compose up --build
```

접속 주소:
- Web: http://localhost:3000
- API: http://localhost:8000
- Swagger: http://localhost:8000/docs

---

## 마이그레이션 (Alembic)

```
cd infra
docker compose exec api alembic upgrade head
```

---

## 첨부파일 업로드 구조

1. API에서 Presigned PUT URL 발급
2. 클라이언트가 Object Storage에 직접 업로드
3. 업로드 완료 메타 정보를 API에 등록
4. 다운로드 시 Presigned GET URL 사용

`STORAGE_BACKEND=local`일 경우 `/data/uploads`에 저장됩니다.

---

## 사용자 동기화 (옵션)

MIS DB에서 사용자 데이터를 동기화하는 기능이 있습니다.  
관련 환경변수는 `apps/api/.env.example`에서 확인하세요.

수동 동기화:
```
cd infra
docker compose exec api python -c "from app.core.user_sync import sync_users_once; sync_users_once()"
```

---

## 운영 팁

- Object Storage를 쓰는 경우, 자격 증명 경로를 컨테이너에 마운트합니다.  
  Compose에서 `AWS_SHARED_CREDENTIALS_DIR` 환경 변수를 사용합니다.
- SMTP는 내부망 전용 설정이므로 운영 환경에서 실제 발송 테스트가 필요합니다.

---

## License

Internal PoC / Educational Use
