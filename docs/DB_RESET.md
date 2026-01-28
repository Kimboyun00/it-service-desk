# DB 완전 초기화 (ID 1부터 다시 시작)

배포 전 DB를 비우고 시퀀스(ID)를 1부터 다시 시작하려면 아래 방법 중 하나를 사용하면 됩니다.

## 전제 조건

- PostgreSQL 클라이언트(`psql` 또는 GUI)로 DB에 접속할 수 있어야 함
- `DATABASE_URL`에 쓰이는 DB 이름·호스트·계정 정보 확인

---

## 방법 1: 데이터베이스 삭제 후 재생성 (가장 단순)

**모든 테이블과 데이터가 사라지고, ID도 1부터 다시 시작합니다.**  
users 테이블도 새로 만들어지며, admin/test 같은 기본 계정은 더 이상 자동 생성되지 않습니다.

### 1) 다른 접속이 없는지 확인

```bash
# PostgreSQL 서버에서 해당 DB 접속 수 확인 (선택)
# 필요 시 애플리케이션/연결 풀을 잠시 끄고 진행
```

### 2) DB 삭제 후 같은 이름으로 재생성

`postgres`(또는 슈퍼유저) 계정으로 **다른 DB**(예: `postgres`)에 접속한 뒤 실행:

```bash
psql -h <호스트> -U <슈퍼유저> -d postgres -c "DROP DATABASE IF EXISTS <DB이름>;"
psql -h <호스트> -U <슈퍼유저> -d postgres -c "CREATE DATABASE <DB이름> OWNER <소유계정>;"
```

예시 (DB 이름 `kdis_ticket`, 소유자 `kdis_ticket`):

```bash
psql -h localhost -U postgres -d postgres -c "DROP DATABASE IF EXISTS kdis_ticket;"
psql -h localhost -U postgres -d postgres -c "CREATE DATABASE kdis_ticket OWNER kdis_ticket;"
```

### 3) 마이그레이션으로 스키마·시퀀스 생성

API 프로젝트 루트에서:

```bash
cd apps/api
export DATABASE_URL="postgresql+psycopg://..."   # 실제 연결 문자열로 설정
alembic upgrade head
```

또는 Docker 사용 시:

```bash
docker compose exec api alembic upgrade head
```

이후부터는 모든 테이블의 ID가 1부터 시작합니다.  
기본 admin/test 사용자는 시드에서 제거되어 있어서 자동 생성되지 않습니다.

---

## 방법 2: 스키마만 삭제 후 마이그레이션 (같은 DB 유지)

DB는 그대로 두고, **public 스키마의 모든 객체만 제거**한 뒤 마이그레이션을 다시 돌리는 방법입니다.

주의: `search_path`에 `public`만 쓰는 경우에 적합합니다. 다른 스키마를 쓰면 대상 스키마에 맞게 바꿔야 합니다.

```bash
psql -h <호스트> -U <계정> -d <DB이름> -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

이후:

```bash
cd apps/api
alembic upgrade head
```

테이블·시퀀스가 새로 생성되므로 ID는 다시 1부터 시작합니다.

---

## 방법 3: users만 남기고 admin/test만 삭제

**“DB는 완전 초기화하되, users 테이블 구조는 유지하고, admin/test 행만 없애고 싶다”**는 의미라면:

- **다른 테이블은** 방법 1/2처럼 DB 또는 스키마 초기화로 비울 수 있고,
- **users 내용만** 다음처럼 admin/test만 지울 수 있습니다.

```sql
-- admin, test 계정만 삭제 (다른 계정은 유지)
DELETE FROM users WHERE emp_no IN ('admin', 'test');
```

테이블 구조와 나머지 사용자는 그대로 두고, admin/test만 제거됩니다.  
(이 경우 tickets 등 다른 테이블의 ID를 1부터 만들려면 해당 테이블들은 별도로 TRUNCATE 또는 방법 1/2를 사용해야 합니다.)

---

## 정리

| 목표                           | 사용할 방법                    |
|--------------------------------|--------------------------------|
| 모든 테이블·데이터 삭제, ID 1부터 | 방법 1 (DROP/CREATE DATABASE)  |
| 같은 DB에서 스키마만 초기화       | 방법 2 (DROP SCHEMA CASCADE)   |
| users만 두고 admin/test만 삭제   | 방법 3 (DELETE FROM users …)   |

방법 1 또는 2를 쓴 뒤에는 반드시 `alembic upgrade head`를 실행해야 합니다.  
이제 시드에서 admin/test를 만들지 않으므로, 초기화 후 users 테이블에는 시드로 생성되는 계정이 없습니다.
