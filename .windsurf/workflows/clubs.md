
---
description: Clubs + Courts + Availability quick test
---

Use this workflow to quickly:

- List clubs and copy a real `clubId`
- Fetch courts for that club
- Fix mismatched `Court.clubId` values (if you seeded with placeholders like `club_123`)
- Test `/availability`

## 1) Swagger entry point

- Open `http://localhost:3000/docs`

## 2) List clubs (get a real UUID)

- Request:

  - `GET /clubs`

- Copy one club `id` (UUID) -> call it `<CLUB_ID>`

## 3) List courts for a club

- Request:

  - `GET /clubs/<CLUB_ID>/courts`

- Expected outcomes:

  - `404 Club not found` -> `<CLUB_ID>` doesn't exist in DB
  - `200 []` -> club exists but has no courts
  - `200 [ ... ]` -> club exists and has courts

## 4) If courts exist but point to a fake clubId (SQL fix)

If you previously seeded courts with something like `club_123` instead of a real UUID:

1. Confirm how many courts are affected:

   ```sql
   select count(*)
   from app."Court"
   where "clubId" = 'club_123';
   ```

2. Confirm the destination club exists:

   ```sql
   select id, name
   from app."Club"
   where id = '<CLUB_ID>';
   ```

3. Update courts to point to the real UUID:

   ```sql
   update app."Court"
   set "clubId" = '<CLUB_ID>'
   where "clubId" = 'club_123';
   ```

4. Re-test:

   - `GET /clubs/<CLUB_ID>/courts`

## 5) Test availability

- Request:

  - `GET /availability?clubId=<CLUB_ID>&date=2026-07-01`

- Notes:

  - Slots are generated in UTC (`...Z`)
  - If there are no courts, availability will be empty / not meaningful

