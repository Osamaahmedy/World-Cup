"""Seed database with default admin, employees, teams, matches, news, announcements, prizes."""
from datetime import datetime, timedelta, timezone

from database import db
from models import Team, Match, News, Announcement, Prize, Notification
from security import hash_password


async def seed_all():
    # Settings
    if not await db.settings.find_one({"key": "scoring_rules"}):
        await db.settings.insert_one({"key": "scoring_rules", "value": {"exact": 10, "outcome_and_diff": 5, "outcome_only": 3, "wrong": 0}})
    if not await db.settings.find_one({"key": "prediction_window"}):
        await db.settings.insert_one({"key": "prediction_window", "value": {"open": True}})
    # Branding — full iLogic identity (migrates existing installs to v2)
    ICON_URL = "https://customer-assets.emergentagent.com/job_ba32adbb-ea62-4849-a2c8-c2a8cdda74d8/artifacts/yd9z4os8_icon_ilogic-03-01.png"
    SYMBOL_URL = "https://customer-assets.emergentagent.com/job_ba32adbb-ea62-4849-a2c8-c2a8cdda74d8/artifacts/nb00pz2v_%D8%A7%D9%8A%D9%82%D9%88%D9%86%D9%87.png"
    default_branding = {
        "name_en": "iLogic World Cup Predictor",
        "name_ar": "آيلوجيك - توقعات كأس العالم",
        "logo_url": ICON_URL,
        "favicon_url": ICON_URL,
        "symbol_url": SYMBOL_URL,
        "login_image_url": "https://images.pexels.com/photos/35898730/pexels-photo-35898730.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1200",
        "login_tagline_en": "Predict. Compete. Win.",
        "login_tagline_ar": "توقّع. تنافس. اربح.",
        "background_style": "pattern",
        "background_image_url": "",
        "colors": {
            "primary": "#064E3B",
            "primary_foreground": "#FFFFFF",
            "accent": "#D4AF37",
            "accent_foreground": "#0F172A",
            "background": "#F8FAFC",
            "foreground": "#0F172A",
            "card": "#FFFFFF",
            "secondary": "#F1F5F9",
            "border": "#E2E8F0",
        },
        "_brand_version": 2,
    }
    existing = await db.settings.find_one({"key": "branding"})
    if not existing:
        await db.settings.insert_one({"key": "branding", "value": default_branding})
    else:
        val = existing.get("value") or {}
        if val.get("_brand_version") != 2:
            await db.settings.update_one({"key": "branding"}, {"$set": {"value": default_branding}})
        else:
            merged = {**default_branding, **val}
            merged["colors"] = {**default_branding["colors"], **(val.get("colors") or {})}
            if merged != val:
                await db.settings.update_one({"key": "branding"}, {"$set": {"value": merged}})

    # Users: super admin, admin, and demo employees (login by employee_id)
    # Default employee password is "123456" (must be changed on first login).
    if not await db.users.find_one({"employee_id": "1000"}):
        await db.users.insert_one({
            "id": "superadmin-0001",
            "employee_id": "1000",
            "full_name": "Super Administrator",
            "department": "IT",
            "role": "super_admin",
            "active": True,
            "avatar_url": None,
            "password_hash": hash_password("Admin@12345"),
            "requires_password_change": False,
            "total_points": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    if not await db.users.find_one({"employee_id": "1001"}):
        await db.users.insert_one({
            "id": "admin-0001",
            "employee_id": "1001",
            "full_name": "System Administrator",
            "department": "IT",
            "role": "admin",
            "active": True,
            "avatar_url": None,
            "password_hash": hash_password("Admin@12345"),
            "requires_password_change": False,
            "total_points": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Primary demo employee — keeps default password to demonstrate forced change
    if not await db.users.find_one({"employee_id": "1002"}):
        await db.users.insert_one({
            "id": "emp-0001",
            "employee_id": "1002",
            "full_name": "Ahmed Al-Rashed",
            "department": "Finance",
            "role": "employee",
            "active": True,
            "avatar_url": None,
            "password_hash": hash_password("123456"),
            "requires_password_change": True,
            "total_points": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    demo_employees = [
        ("1003", "Sara Khan", "Marketing"),
        ("1004", "Mohammed Ali", "Operations"),
        ("1005", "Layla Hassan", "HR"),
        ("1006", "Omar Riyad", "Finance"),
        ("1007", "Noura Saleh", "IT"),
        ("1008", "Yousef Khaled", "Operations"),
        ("1009", "Fatima Mahmoud", "Marketing"),
        ("1010", "Khalid Anwar", "HR"),
    ]
    for emp_id, name, dept in demo_employees:
        if not await db.users.find_one({"employee_id": emp_id}):
            await db.users.insert_one({
                "id": "emp-" + emp_id,
                "employee_id": emp_id,
                "full_name": name,
                "department": dept,
                "role": "employee",
                "active": True,
                "avatar_url": None,
                "password_hash": hash_password("123456"),
                "requires_password_change": False,
                "total_points": 0,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

    # Teams (small subset spanning groups A-D)
    teams_seed = [
        ("Saudi Arabia", "KSA", "🇸🇦", "A"),
        ("Argentina", "ARG", "🇦🇷", "A"),
        ("Mexico", "MEX", "🇲🇽", "A"),
        ("Poland", "POL", "🇵🇱", "A"),
        ("England", "ENG", "🏴", "B"),
        ("USA", "USA", "🇺🇸", "B"),
        ("Iran", "IRN", "🇮🇷", "B"),
        ("Wales", "WAL", "🏴", "B"),
        ("France", "FRA", "🇫🇷", "C"),
        ("Australia", "AUS", "🇦🇺", "C"),
        ("Denmark", "DEN", "🇩🇰", "C"),
        ("Tunisia", "TUN", "🇹🇳", "C"),
        ("Spain", "ESP", "🇪🇸", "D"),
        ("Germany", "GER", "🇩🇪", "D"),
        ("Japan", "JPN", "🇯🇵", "D"),
        ("Morocco", "MAR", "🇲🇦", "D"),
    ]
    team_id_by_code = {}
    for name, code, flag, group in teams_seed:
        existing = await db.teams.find_one({"code": code}, {"_id": 0})
        if existing:
            team_id_by_code[code] = existing["id"]
            continue
        t = Team(name=name, code=code, flag_emoji=flag, group=group)
        doc = t.model_dump()
        await db.teams.insert_one(doc)
        team_id_by_code[code] = t.id

    # Matches seed (some upcoming, some finished)
    if await db.matches.count_documents({}) == 0:
        base = datetime.now(timezone.utc)
        sched = [
            ("KSA", "ARG", -3, "finished", 2, 1, "A"),
            ("MEX", "POL", -2, "finished", 0, 0, "A"),
            ("ENG", "USA", -1, "finished", 1, 1, "B"),
            ("FRA", "AUS", 0, "live", None, None, "C"),
            ("ESP", "GER", 1, "scheduled", None, None, "D"),
            ("JPN", "MAR", 2, "scheduled", None, None, "D"),
            ("DEN", "TUN", 3, "scheduled", None, None, "C"),
            ("KSA", "MEX", 4, "scheduled", None, None, "A"),
            ("ARG", "POL", 5, "scheduled", None, None, "A"),
            ("IRN", "WAL", 6, "scheduled", None, None, "B"),
            ("USA", "WAL", 7, "scheduled", None, None, "B"),
            ("ENG", "IRN", 8, "scheduled", None, None, "B"),
        ]
        for h, a, day_offset, status, hs, as_, group in sched:
            kickoff = (base + timedelta(days=day_offset, hours=2)).isoformat()
            m = Match(
                home_team_id=team_id_by_code[h],
                away_team_id=team_id_by_code[a],
                kickoff=kickoff,
                stage="group",
                venue="Lusail Stadium",
                group=group,
                home_score=hs,
                away_score=as_,
                status=status,
            )
            await db.matches.insert_one(m.model_dump())

    # News
    if await db.news.count_documents({}) == 0:
        items = [
            News(
                title="Welcome to the Company World Cup Predictor!",
                title_ar="مرحباً بك في منصة توقعات كأس العالم!",
                body="Join thousands of colleagues and compete for the top spot on the leaderboard. Predict, win, celebrate.",
                body_ar="انضم إلى آلاف الزملاء وتنافس على المركز الأول. توقّع واربح واحتفل.",
                image_url="https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?crop=entropy&cs=srgb&fm=jpg&q=85",
                category="world_cup",
            ),
            News(
                title="Argentina edges Saudi Arabia in opening clash",
                title_ar="الأرجنتين تتغلب على السعودية في افتتاح المجموعة",
                body="A tense Group A opener delivered drama until the final whistle.",
                body_ar="مباراة افتتاح مجموعة A جاءت مليئة بالإثارة حتى صافرة النهاية.",
                category="team",
            ),
            News(
                title="Group A Standings update",
                title_ar="تحديث ترتيب المجموعة A",
                body="See the latest standings across all groups in the Standings tab.",
                body_ar="اطّلع على آخر ترتيب جميع المجموعات في تبويب الترتيب.",
                category="stats",
            ),
        ]
        for n in items:
            await db.news.insert_one(n.model_dump())

    # Announcement
    if await db.announcements.count_documents({}) == 0:
        a = Announcement(
            title="Grand Prize Announced!",
            title_ar="الإعلان عن الجائزة الكبرى!",
            body="Top performer wins a fully paid weekend trip. Full leaderboard rules in Prizes section.",
            body_ar="الفائز الأول يحصل على رحلة نهاية أسبوع مدفوعة بالكامل. التفاصيل في قسم الجوائز.",
            pinned=True,
        )
        await db.announcements.insert_one(a.model_dump())

    # Prizes
    if await db.prizes.count_documents({}) == 0:
        prizes = [
            Prize(title="Grand Champion", title_ar="البطل الأكبر", description="1st place prize — Weekend Getaway", rank_from=1, rank_to=1, icon="trophy"),
            Prize(title="Runner Up", title_ar="الوصيف", description="2nd place — Premium Smartwatch", rank_from=2, rank_to=2, icon="medal"),
            Prize(title="Bronze Predictor", title_ar="المتنبئ البرونزي", description="3rd place — Gift Voucher", rank_from=3, rank_to=3, icon="award"),
            Prize(title="Top 10 Recognition", title_ar="تكريم أفضل 10", description="Top 4–10 — Company merchandise", rank_from=4, rank_to=10, icon="star"),
        ]
        for p in prizes:
            await db.prizes.insert_one(p.model_dump())

    # Broadcast notification
    if await db.notifications.count_documents({}) == 0:
        n = Notification(
            user_id=None,
            title="Predictions are open!",
            title_ar="التوقعات مفتوحة الآن!",
            body="Make your picks before kickoff.",
            body_ar="سجّل توقعاتك قبل صافرة البداية.",
            type="admin",
        )
        await db.notifications.insert_one(n.model_dump())
