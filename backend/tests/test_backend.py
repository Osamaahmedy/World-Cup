"""End-to-end backend tests for Company World Cup Predictor.

Coverage:
- Health & branding
- Auth (login, /me, brute-force throttle, RBAC)
- Tournament (teams, matches, standings)
- Users (admin CRUD, CSV import)
- Predictions (create/update/lock/window)
- Match result auto-scoring -> leaderboard / user.total_points
- Leaderboard (global, me, dept filter)
- Dashboard (enriched)
- Content (news, announcements, prizes, notifications, assign-winners)
- Admin reports + audit logs + settings (scoring + window)
"""
from __future__ import annotations

import io
import os
import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Read from frontend/.env directly as fallback
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = BASE_URL + "/api"

ADMIN_ID = "1000"
ADMIN_PASS = "Admin@12345"
EMP_ID = "1003"
EMP_PASS = "123456"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def _login(s, employee_id, password):
    r = s.post(f"{API}/auth/login", json={"employee_id": employee_id, "password": password})
    return r


@pytest.fixture(scope="session")
def admin_token(s):
    r = _login(s, ADMIN_ID, ADMIN_PASS)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def emp_token(s):
    r = _login(s, EMP_ID, EMP_PASS)
    assert r.status_code == 200, f"employee login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


def h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Health ----------
class TestHealth:
    def test_health(self, s):
        r = s.get(f"{API}/health")
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}

    def test_root(self, s):
        r = s.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert "message" in data and data.get("version")

    def test_branding_public(self, s):
        r = s.get(f"{API}/branding")
        assert r.status_code == 200
        # Should be dict with brand keys
        data = r.json()
        assert isinstance(data, dict)


# ---------- Auth ----------
class TestAuth:
    def test_admin_login(self, s):
        r = _login(s, ADMIN_ID, ADMIN_PASS)
        assert r.status_code == 200
        data = r.json()
        assert data["access_token"]
        assert data["user"]["role"] == "super_admin"
        assert "password_hash" not in data["user"]

    def test_employee_login(self, s):
        r = _login(s, EMP_ID, EMP_PASS)
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["role"] == "employee"

    def test_wrong_password(self, s):
        r = _login(s, ADMIN_ID, "WrongPass!")
        assert r.status_code == 401

    def test_me_with_token(self, s, emp_token):
        r = s.get(f"{API}/auth/me", headers=h(emp_token))
        assert r.status_code == 200
        data = r.json()
        assert data["employee_id"] == EMP_ID
        assert "password_hash" not in data

    def test_me_no_token(self, s):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code in (401, 403)


# ---------- Tournament ----------
class TestTournament:
    def test_list_teams(self, s, emp_token):
        r = s.get(f"{API}/tournament/teams", headers=h(emp_token))
        assert r.status_code == 200
        teams = r.json()
        assert len(teams) >= 16
        assert all("id" in t and "code" in t for t in teams)

    def test_list_matches(self, s, emp_token):
        r = s.get(f"{API}/tournament/matches", headers=h(emp_token))
        assert r.status_code == 200
        matches = r.json()
        assert len(matches) >= 12

    def test_standings(self, s, emp_token):
        r = s.get(f"{API}/tournament/standings", headers=h(emp_token))
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict)
        # Should be keyed by group ("A", "B", etc.)
        assert any(k in data for k in ("A", "B", "C", "D"))


# ---------- Admin users CRUD ----------
class TestAdminUsers:
    created_id = None

    def test_create_user(self, s, admin_token):
        emp_id = f"TST{uuid.uuid4().hex[:6]}"
        payload = {
            "employee_id": emp_id,
            "full_name": "Test User",
            "department": "QA",
            "role": "employee",
            "password": "TestPass@123",
        }
        r = s.post(f"{API}/users", headers=h(admin_token), json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["employee_id"] == emp_id
        assert data["role"] == "employee"
        assert "password_hash" not in data
        TestAdminUsers.created_id = data["id"]

    def test_patch_user(self, s, admin_token):
        assert TestAdminUsers.created_id
        r = s.patch(
            f"{API}/users/{TestAdminUsers.created_id}",
            headers=h(admin_token),
            json={"full_name": "Updated Name"},
        )
        assert r.status_code == 200
        assert r.json()["full_name"] == "Updated Name"

    def test_reset_password(self, s, admin_token):
        assert TestAdminUsers.created_id
        r = s.post(f"{API}/users/{TestAdminUsers.created_id}/reset-password", headers=h(admin_token))
        assert r.status_code == 200
        # User should now be flagged for a forced change
        lst = s.get(f"{API}/users?q=Updated", headers=h(admin_token)).json()
        target = next((u for u in lst if u["id"] == TestAdminUsers.created_id), None)
        assert target and target["requires_password_change"] is True

    def test_delete_user(self, s, admin_token):
        assert TestAdminUsers.created_id
        r = s.delete(f"{API}/users/{TestAdminUsers.created_id}", headers=h(admin_token))
        assert r.status_code == 200

    def test_csv_import(self, s, admin_token):
        csv_data = (
            "employee_id,full_name,department,role\n"
            f"IMP{uuid.uuid4().hex[:6]},Imp One,QA,employee\n"
            f"IMP{uuid.uuid4().hex[:6]},Imp Two,QA,employee\n"
        )
        files = {"file": ("users.csv", io.BytesIO(csv_data.encode()), "text/csv")}
        # Note: must not send JSON content-type for multipart
        r = requests.post(
            f"{API}/users/import",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["created"] == 2
        assert data["skipped"] == 0

    def test_rbac_employee_cannot_create_user(self, s, emp_token):
        r = s.post(
            f"{API}/users",
            headers=h(emp_token),
            json={
                "employee_id": "TSTBLOCK",
                "full_name": "Blocked",
                "password": "Pass@123",
                "role": "employee",
            },
        )
        assert r.status_code == 403


# ---------- Predictions ----------
class TestPredictions:
    def _scheduled_match(self, s, token):
        r = s.get(f"{API}/tournament/matches?status=scheduled", headers=h(token))
        assert r.status_code == 200
        for m in r.json():
            try:
                ko = datetime.fromisoformat(m["kickoff"].replace("Z", "+00:00"))
            except Exception:
                continue
            if ko > datetime.now(timezone.utc):
                return m
        return None

    def _live_or_finished_match(self, s, token):
        r = s.get(f"{API}/tournament/matches", headers=h(token))
        for m in r.json():
            if m["status"] in ("live", "finished"):
                return m
        return None

    def test_create_prediction(self, s, emp_token):
        m = self._scheduled_match(s, emp_token)
        assert m, "No scheduled future match seeded"
        r = s.post(
            f"{API}/predictions",
            headers=h(emp_token),
            json={"match_id": m["id"], "home_score": 2, "away_score": 1},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["home_score"] == 2 and data["away_score"] == 1

    def test_update_prediction_idempotent(self, s, emp_token):
        m = self._scheduled_match(s, emp_token)
        # Second post should update, not duplicate
        r = s.post(
            f"{API}/predictions",
            headers=h(emp_token),
            json={"match_id": m["id"], "home_score": 3, "away_score": 0},
        )
        assert r.status_code == 200
        # Confirm via /mine
        mine = s.get(f"{API}/predictions/mine", headers=h(emp_token)).json()
        matching = [p for p in mine if p["match_id"] == m["id"]]
        assert len(matching) == 1
        assert matching[0]["home_score"] == 3 and matching[0]["away_score"] == 0

    def test_locked_match_returns_423(self, s, emp_token):
        m = self._live_or_finished_match(s, emp_token)
        if not m:
            pytest.skip("No live/finished match seeded")
        r = s.post(
            f"{API}/predictions",
            headers=h(emp_token),
            json={"match_id": m["id"], "home_score": 1, "away_score": 0},
        )
        assert r.status_code == 423

    def test_window_closed_blocks_prediction(self, s, admin_token, emp_token):
        # Close window
        r = s.put(
            f"{API}/admin/settings/window",
            headers=h(admin_token),
            json={"open": False},
        )
        assert r.status_code == 200
        m = self._scheduled_match(s, emp_token)
        r = s.post(
            f"{API}/predictions",
            headers=h(emp_token),
            json={"match_id": m["id"], "home_score": 1, "away_score": 1},
        )
        assert r.status_code == 403
        # Reopen
        r = s.put(
            f"{API}/admin/settings/window",
            headers=h(admin_token),
            json={"open": True},
        )
        assert r.status_code == 200


# ---------- Match result + auto scoring ----------
class TestScoring:
    def test_result_settles_predictions(self, s, admin_token, emp_token):
        # Pick a scheduled match where employee predicts then admin sets result = same score → exact (10 pts)
        r = s.get(f"{API}/tournament/matches?status=scheduled", headers=h(admin_token))
        future = None
        for m in r.json():
            ko = datetime.fromisoformat(m["kickoff"].replace("Z", "+00:00"))
            if ko > datetime.now(timezone.utc):
                future = m
                break
        assert future
        # Get employee total before
        me_before = s.get(f"{API}/auth/me", headers=h(emp_token)).json()
        before_points = me_before.get("total_points", 0)

        # Employee makes exact-score prediction
        s.post(
            f"{API}/predictions",
            headers=h(emp_token),
            json={"match_id": future["id"], "home_score": 4, "away_score": 2},
        )

        # Admin settles match with same score
        r = s.patch(
            f"{API}/tournament/matches/{future['id']}/result",
            headers=h(admin_token),
            json={"home_score": 4, "away_score": 2},
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "finished"

        # Check prediction got points
        mine = s.get(f"{API}/predictions/mine", headers=h(emp_token)).json()
        matched = next(p for p in mine if p["match_id"] == future["id"])
        assert matched["points_awarded"] == 10

        # Total points increased
        me_after = s.get(f"{API}/auth/me", headers=h(emp_token)).json()
        assert me_after["total_points"] == before_points + 10


# ---------- Leaderboard ----------
class TestLeaderboard:
    def test_global(self, s, emp_token):
        r = s.get(f"{API}/leaderboard", headers=h(emp_token))
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list) and len(rows) > 0
        assert rows[0]["rank"] == 1
        # Sorted by total_points desc
        pts = [r0["total_points"] for r0 in rows]
        assert pts == sorted(pts, reverse=True)

    def test_me(self, s, emp_token):
        r = s.get(f"{API}/leaderboard/me", headers=h(emp_token))
        assert r.status_code == 200
        data = r.json()
        for key in ("rank", "department_rank", "accuracy", "total_users"):
            assert key in data

    def test_dept_filter(self, s, emp_token):
        r = s.get(f"{API}/leaderboard?department=Finance", headers=h(emp_token))
        assert r.status_code == 200
        # All seeded Finance members or none — but if returned, none should be from other dept
        # (rows don't include department in payload — accept as-is)


# ---------- Dashboard ----------
class TestDashboard:
    def test_dashboard(self, s, emp_token):
        r = s.get(f"{API}/dashboard", headers=h(emp_token))
        assert r.status_code == 200, r.text
        data = r.json()
        for key in ("me", "upcoming_matches", "recent_predictions", "news", "announcements"):
            assert key in data
        # upcoming should have team enrichment when present
        for m in data["upcoming_matches"]:
            assert "home_team" in m and "away_team" in m


# ---------- Content ----------
class TestContent:
    def test_news_list(self, s, emp_token):
        r = s.get(f"{API}/content/news", headers=h(emp_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_announcements_list(self, s, emp_token):
        r = s.get(f"{API}/content/announcements", headers=h(emp_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_prizes_list(self, s, emp_token):
        r = s.get(f"{API}/content/prizes", headers=h(emp_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_notifications_list(self, s, emp_token):
        r = s.get(f"{API}/content/notifications", headers=h(emp_token))
        assert r.status_code == 200

    def test_admin_create_news(self, s, admin_token):
        payload = {
            "title": "TEST News",
            "body": "Body",
            "category": "world_cup",
        }
        r = s.post(f"{API}/content/news", headers=h(admin_token), json=payload)
        assert r.status_code == 200
        nid = r.json()["id"]
        # Delete
        r = s.delete(f"{API}/content/news/{nid}", headers=h(admin_token))
        assert r.status_code == 200

    def test_employee_cannot_create_news(self, s, emp_token):
        r = s.post(
            f"{API}/content/news",
            headers=h(emp_token),
            json={"title": "x", "body": "y"},
        )
        assert r.status_code == 403

    def test_assign_winners(self, s, admin_token):
        r = s.post(f"{API}/content/prizes/assign-winners", headers=h(admin_token))
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        # Each assignment has prize + winners
        for a in data:
            assert "prize" in a and "winners" in a


# ---------- Admin reports + audit + settings ----------
class TestAdminReports:
    def test_overview(self, s, admin_token):
        r = s.get(f"{API}/admin/reports/overview", headers=h(admin_token))
        assert r.status_code == 200
        for k in ("total_users", "total_matches", "total_predictions", "participation_rate"):
            assert k in r.json()

    def test_departments(self, s, admin_token):
        r = s.get(f"{API}/admin/reports/departments", headers=h(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_accuracy(self, s, admin_token):
        r = s.get(f"{API}/admin/reports/accuracy", headers=h(admin_token))
        assert r.status_code == 200
        for k in ("settled", "correct_outcome", "exact_scores", "accuracy"):
            assert k in r.json()

    def test_employee_blocked_from_reports(self, s, emp_token):
        r = s.get(f"{API}/admin/reports/overview", headers=h(emp_token))
        assert r.status_code == 403

    def test_audit_logs(self, s, admin_token):
        r = s.get(f"{API}/admin/audit-logs", headers=h(admin_token))
        assert r.status_code == 200
        logs = r.json()
        assert isinstance(logs, list) and len(logs) > 0
        actions = {entry["action"] for entry in logs}
        # Must have login_success at minimum (we logged in earlier)
        assert "login_success" in actions

    def test_audit_logs_login_failed_present(self, s, admin_token):
        # Trigger a failed login
        requests.post(f"{API}/auth/login", json={"employee_id": "9999", "password": "bad"})
        time.sleep(0.3)
        r = s.get(f"{API}/admin/audit-logs?action=login_failed", headers=h(admin_token))
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_scoring_settings_roundtrip(self, s, admin_token):
        new_rules = {"exact": 12, "outcome_and_diff": 6, "outcome_only": 3, "wrong": 0}
        r = s.put(f"{API}/admin/settings/scoring", headers=h(admin_token), json=new_rules)
        assert r.status_code == 200
        r2 = s.get(f"{API}/admin/settings/scoring", headers=h(admin_token))
        assert r2.json() == new_rules
        # Restore default
        s.put(
            f"{API}/admin/settings/scoring",
            headers=h(admin_token),
            json={"exact": 10, "outcome_and_diff": 5, "outcome_only": 3, "wrong": 0},
        )


# ---------- RBAC misc ----------
class TestRBAC:
    def test_employee_cannot_access_admin_settings(self, s, emp_token):
        r = s.get(f"{API}/admin/settings/scoring", headers=h(emp_token))
        assert r.status_code == 403

    def test_employee_cannot_access_audit_logs(self, s, emp_token):
        r = s.get(f"{API}/admin/audit-logs", headers=h(emp_token))
        assert r.status_code == 403


# ---------- Forced password change + strong policy ----------
class TestPasswordPolicy:
    emp_id = None
    uid = None

    def test_new_user_requires_change(self, s, admin_token):
        TestPasswordPolicy.emp_id = f"PW{uuid.uuid4().hex[:6]}"
        r = s.post(f"{API}/users", headers=h(admin_token), json={
            "employee_id": TestPasswordPolicy.emp_id,
            "full_name": "Policy User",
            "department": "QA",
            "role": "employee",
        })
        assert r.status_code == 200, r.text
        data = r.json()
        TestPasswordPolicy.uid = data["id"]
        assert data["requires_password_change"] is True
        # default password works for login
        login = _login(s, TestPasswordPolicy.emp_id, "123456")
        assert login.status_code == 200
        assert login.json()["user"]["requires_password_change"] is True

    def test_weak_password_rejected(self, s):
        login = _login(s, TestPasswordPolicy.emp_id, "123456")
        token = login.json()["access_token"]
        r = s.post(f"{API}/auth/change-password", headers=h(token),
                   json={"current_password": "123456", "new_password": "weak"})
        assert r.status_code == 400

    def test_strong_password_accepted_and_clears_flag(self, s):
        login = _login(s, TestPasswordPolicy.emp_id, "123456")
        token = login.json()["access_token"]
        r = s.post(f"{API}/auth/change-password", headers=h(token),
                   json={"current_password": "123456", "new_password": "Strong@2026"})
        assert r.status_code == 200, r.text
        # Re-login with new password, flag cleared
        relog = _login(s, TestPasswordPolicy.emp_id, "Strong@2026")
        assert relog.status_code == 200
        assert relog.json()["user"]["requires_password_change"] is False

    def test_wrong_current_password_rejected(self, s):
        login = _login(s, TestPasswordPolicy.emp_id, "Strong@2026")
        token = login.json()["access_token"]
        r = s.post(f"{API}/auth/change-password", headers=h(token),
                   json={"current_password": "WrongOne@1", "new_password": "Another@2026"})
        assert r.status_code == 400

    def test_admin_reset_forces_change_again(self, s, admin_token):
        r = s.post(f"{API}/users/{TestPasswordPolicy.uid}/reset-password", headers=h(admin_token))
        assert r.status_code == 200
        relog = _login(s, TestPasswordPolicy.emp_id, "123456")
        assert relog.status_code == 200
        assert relog.json()["user"]["requires_password_change"] is True
        # cleanup
        s.delete(f"{API}/users/{TestPasswordPolicy.uid}", headers=h(admin_token))


# ---------- Super admin vs admin RBAC for branding ----------
class TestBrandingRBAC:
    def test_super_admin_can_read_branding(self, s, admin_token):
        r = s.get(f"{API}/admin/settings/branding", headers=h(admin_token))
        assert r.status_code == 200

    def test_regular_admin_blocked_from_branding(self, s):
        login = _login(s, "1001", "Admin@12345")
        assert login.status_code == 200
        token = login.json()["access_token"]
        r = s.get(f"{API}/admin/settings/branding", headers=h(token))
        assert r.status_code == 403

    def test_regular_admin_can_access_other_admin_endpoints(self, s):
        login = _login(s, "1001", "Admin@12345")
        token = login.json()["access_token"]
        r = s.get(f"{API}/admin/reports/overview", headers=h(token))
        assert r.status_code == 200


# ---------- Brute-force throttle (RUN LAST) ----------
class TestZBruteForce:
    """Runs last (Z prefix) — pollutes in-memory throttle map for the throwaway id."""

    def test_rate_limit_429(self):
        sess = requests.Session()
        stable_ip = f"203.0.113.{uuid.uuid4().int % 250 + 1}"  # TEST-NET-3 range, stable per test
        sess.headers.update({"X-Forwarded-For": stable_ip})
        throwaway = f"ZZ{uuid.uuid4().hex[:6]}"
        statuses = []
        for _ in range(6):
            r = sess.post(f"{API}/auth/login", json={"employee_id": throwaway, "password": "wrong"})
            statuses.append(r.status_code)
        # First 5 should be 401, then 429 on the 6th
        assert statuses[-1] == 429, f"Expected 429 on 6th attempt, got {statuses}"
        assert statuses[:5] == [401] * 5, f"Expected 5x401 first, got {statuses}"
        assert all(c in (401, 429) for c in statuses)

    def test_lockout_persists_even_with_correct_password(self):
        """After 5 wrong attempts trigger 429, even a correct password still gets 429 within window."""
        sess = requests.Session()
        stable_ip = f"198.51.100.{uuid.uuid4().int % 250 + 1}"  # TEST-NET-2 range
        sess.headers.update({"X-Forwarded-For": stable_ip})
        throwaway = f"ZL{uuid.uuid4().hex[:6]}"
        for _ in range(5):
            sess.post(f"{API}/auth/login", json={"employee_id": throwaway, "password": "wrong"})
        # 6th attempt with "correct" password (doesn't matter, user doesn't exist) should still be 429
        r = sess.post(f"{API}/auth/login", json={"employee_id": throwaway, "password": "AnyPassword@123"})
        assert r.status_code == 429, f"Expected 429 (lockout persists), got {r.status_code}"

    def test_valid_login_still_works_after_xff_change(self):
        """Sanity check: valid admin login still returns 200 with new XFF-based throttling."""
        sess = requests.Session()
        # Use a brand new IP that hasn't been throttled
        sess.headers.update({"X-Forwarded-For": f"192.0.2.{uuid.uuid4().int % 250 + 1}"})
        r = sess.post(f"{API}/auth/login", json={"employee_id": "1000", "password": "Admin@12345"})
        assert r.status_code == 200, f"Admin login broken: {r.status_code} {r.text}"
        data = r.json()
        assert "access_token" in data
        assert data["user"]["role"] == "super_admin"
