# DB 운영 보완 마이그레이션 적용 방법

`alembic/versions/g4c5d6e7f8a9_db_operational_improvements.py` 마이그레이션은 다음을 적용합니다.

## 적용 내용

1. **tickets 인덱스**  
   - `status`, `created_at`, `requester_emp_no`, `assignee_emp_no`, `category_id`  
   - 복합 인덱스 `(status, created_at)`  
   → 목록/필터/통계 쿼리 성능 개선

2. **FK ON DELETE SET NULL**  
   - `mail_logs.ticket_id` → 티켓 삭제 시 로그 보존, ticket_id만 NULL  
   - `attachments.ticket_id`, `attachments.comment_id`, `attachments.notice_id`  
   → 부모 삭제 시 고아 레코드 방지, 정합성 유지

3. **CHECK 제약**  
   - `tickets.status` ∈ open, in_progress, resolved, closed  
   - `users.role` ∈ requester, admin  
   - `knowledge_items.kind` ∈ notice, faq  
   → 잘못된 값 입력 방지

---

## 적용 방법

### 1. 로컬/개발 DB

```bash
cd apps/api
# 가상환경 활성화 후
alembic upgrade head
```

### 2. Docker Compose (infra)

```bash
cd infra
docker compose exec api alembic upgrade head
```

### 3. 적용 전 확인

- **CHECK 제약**: 기존 데이터에 `tickets.status`, `users.role`, `knowledge_items.kind`가 허용값만 있어야 합니다.  
  - 그렇지 않으면 `ALTER TABLE ... ADD CONSTRAINT ... CHECK` 단계에서 실패합니다.  
  - 문제 시 해당 CHECK만 제거하거나, 잘못된 데이터 수정 후 다시 실행하세요.
- **FK 이름**: PostgreSQL에서 FK 제약 이름이 `{테이블}_{컬럼}_fkey`가 아닌 경우(예: 예전 마이그레이션에서 다른 이름 사용)  
  - `DROP CONSTRAINT IF EXISTS ...`는 무시되고, `ADD CONSTRAINT`에서 “이미 존재” 오류가 날 수 있습니다.  
  - 이때는 실제 DB의 제약 이름을 확인한 뒤, 마이그레이션의 `DROP CONSTRAINT`/`ADD CONSTRAINT`에서 사용하는 이름을 맞춰 수정하세요.

### 4. 롤백 (필요 시)

```bash
docker compose exec api alembic downgrade -1
# 또는
alembic downgrade -1
```

`downgrade()`에서 인덱스 삭제 및 FK/CHECK 제약을 제거해 이전 상태로 되돌립니다.

---

## 적용 후 확인

- 인덱스:  
  `\di ix_tickets_*` (psql) 또는 DB 클라이언트에서 `tickets` 테이블 인덱스 목록 확인  
- FK:  
  `mail_logs`, `attachments`의 `ticket_id` / `comment_id` / `notice_id` FK에 `ON DELETE SET NULL` 적용 여부 확인  
- CHECK:  
  `tickets`, `users`, `knowledge_items` 테이블에 `chk_*` 제약 존재 여부 확인  

이후 목록/대시보드 등 실제 쿼리로 성능이 개선되었는지 확인하면 됩니다.
