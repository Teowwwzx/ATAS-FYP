# Fix DB Error and Improve Event Creation

## Join Method Column (DB)
- Root cause: `join_method` used in `EventParticipant` (`backend/app/models/event_model.py:113`) but missing in DB schema; Postgres raises UndefinedColumn during organizer participant insert.
- Action: Create Alembic migration to add `join_method` to `event_participants`:
  - `op.add_column('event_participants', sa.Column('join_method', sa.String(), nullable=True))`
  - Ensure migration runs in production DB; SQLite tests already derive schema from `Base`.

## Strict EventCreate Schema
- Forbid unknown fields on event creation (reject extra keys):
  - Update `backend/app/schemas/event_schema.py:14` with `model_config = {'extra': 'forbid'}` (pydantic v2 equivalent `ConfigDict(extra='forbid')`).
- Make `type` optional and derive default from `format` when omitted:
  - Change `type: EventType` → `type: EventType | None = None` in `EventCreate`.

## Event Creation Defaults & Validation
- Default venue to Asia Pacific University when not provided:
  - Add constant `DEFAULT_APU_PLACE_ID` in `backend/app/routers/event_router.py` and set `venue_place_id` to this when `None`.
  - Keep user-provided `venue_place_id` if present.
- Auto-set `type` based on `format` if not provided:
  - Mapping:
    - `webinar` → `online`
    - `panel_discussion`, `workshop`, `seminar`, `club_event` → `offline`
    - `other` → keep `online` as safe default
  - Do not override if user provided `type`.
- Keep existing validations: non-empty title, end after start, positive `max_participant` (already at `backend/app/routers/event_router.py:178`).

## Frontend UX (Non-forced Auto Type)
- Event Create page: when user changes `format`, set `type` to suggested default but allow manual override before submit.
- No backend forcing; only defaulting when absent.

## Verification
- Migrate Postgres and re-run event creation to ensure organizer participant insert succeeds.
- Add a small test for event creation without `type` to verify backend defaulting logic.

## Task Completion Report
- What was completed:
  - Prepared a plan to add missing DB column, enforce strict schema, default venue, and derive event type when omitted
- Recommendations:
  - Use Alembic to align schemas before running backend; parameterise the default APU place ID via config
- Next steps:
  - Approve the plan; then implement migration and code changes, update frontend create page, and verify with tests