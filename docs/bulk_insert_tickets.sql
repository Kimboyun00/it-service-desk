-- tickets 테이블 80개 대량 INSERT (스키마: ticket)
-- requester_emp_no 는 ticket.users 에 있는 emp_no 를 자동으로 사용합니다.
-- 상태/우선순위/작업구분/요청자 정보는 균형 없이 완전 랜덤.
-- resolved_at, closed_at: status 가 'resolved'/'closed' 일 때만 해당 시각 설정.

WITH row_data AS (
  SELECT
    n,
    '테스트 요청 ' || n || ' - ' || (ARRAY['로그인 오류', '비밀번호 초기화', '프린터 연결', '메일 설정', '권한 문의', '시스템 접속', '재택 환경 설정', '회의실 예약'])[1 + floor(random() * 8)::int] AS title,
    '요청 내용 ' || n || E'입니다.\n상세 설명을 여기에 기록합니다. 필요 시 추가 문의 드리겠습니다.' AS description,
    (ARRAY['open', 'in_progress', 'resolved', 'closed'])[1 + floor(random() * 4)::int] AS status,
    (ARRAY['low', 'medium', 'high'])[1 + floor(random() * 3)::int] AS priority,
    (SELECT id FROM ticket.ticket_categories ORDER BY random() LIMIT 1) AS category_id,
    (ARRAY['incident', 'request', 'change', 'other'])[1 + floor(random() * 4)::int] AS work_type,
    (SELECT emp_no FROM ticket.users ORDER BY random() LIMIT 1) AS requester_emp_no,
    (ARRAY['김철수', '이영희', '박지훈', '정민수', '최수진', '한동훈', '윤서연', '임재현'])[1 + floor(random() * 8)::int] AS requester_kor_name,
    (ARRAY['전문원', '선임전문원', '책임전문원', '인턴'])[1 + floor(random() * 4)::int] AS requester_title,
    (ARRAY['인사팀', '재무팀', '기획팀', '전산2팀', '대외협력팀', '도서2팀', '전략기획팀', '총장실'])[1 + floor(random() * 8)::int] AS requester_department,
    date '2026-01-01' + (floor(random() * 31)::int) * interval '1 day' + (floor(random() * 86400)::int) * interval '1 second' AS created_at,
    floor(random() * 21)::int AS reopen_count
  FROM generate_series(1, 80) AS n
),
with_updated AS (
  SELECT
    *,
    created_at + (floor(random() * 20 * 86400)::bigint) * interval '1 second' AS updated_at
  FROM row_data
),
with_completion AS (
  SELECT
    *,
    CASE
      WHEN status = 'resolved' THEN created_at + (random() * extract(epoch from (updated_at - created_at)))::bigint * interval '1 second'
      ELSE NULL
    END AS resolved_at,
    CASE
      WHEN status = 'closed' THEN created_at + (random() * extract(epoch from (updated_at - created_at)))::bigint * interval '1 second'
      ELSE NULL
    END AS closed_at
  FROM with_updated
)
INSERT INTO ticket.tickets (
  title,
  description,
  status,
  priority,
  category_id,
  work_type,
  project_id,
  requester_emp_no,
  assignee_emp_no,
  requester_kor_name,
  requester_title,
  requester_department,
  created_at,
  updated_at,
  resolved_at,
  closed_at,
  reopen_count
)
SELECT
  title,
  description,
  status,
  priority,
  category_id,
  work_type,
  NULL,
  requester_emp_no,
  NULL,
  requester_kor_name,
  requester_title,
  requester_department,
  created_at,
  updated_at,
  resolved_at,
  closed_at,
  reopen_count
FROM with_completion;
