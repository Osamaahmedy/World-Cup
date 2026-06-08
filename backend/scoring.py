"""Scoring engine."""
from typing import Optional

from database import db


async def get_rules() -> dict:
    doc = await db.settings.find_one({"key": "scoring_rules"}, {"_id": 0})
    if not doc:
        return {"exact": 10, "outcome_and_diff": 5, "outcome_only": 3, "wrong": 0}
    return doc.get("value", {"exact": 10, "outcome_and_diff": 5, "outcome_only": 3, "wrong": 0})


def calc_points(rules: dict, pred_h: int, pred_a: int, act_h: int, act_a: int) -> int:
    if pred_h == act_h and pred_a == act_a:
        return rules["exact"]
    pred_diff = pred_h - pred_a
    act_diff = act_h - act_a
    pred_outcome = (pred_h > pred_a) - (pred_h < pred_a)  # 1, 0, -1
    act_outcome = (act_h > act_a) - (act_h < act_a)
    if pred_outcome == act_outcome and pred_diff == act_diff:
        return rules["outcome_and_diff"]
    if pred_outcome == act_outcome:
        return rules["outcome_only"]
    return rules["wrong"]


async def settle_match(match_id: str) -> int:
    """Compute and apply points for all predictions of a finished match. Returns count updated."""
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match or match.get("home_score") is None or match.get("away_score") is None:
        return 0
    rules = await get_rules()
    preds = await db.predictions.find({"match_id": match_id}, {"_id": 0}).to_list(10000)
    count = 0
    for p in preds:
        pts = calc_points(rules, p["home_score"], p["away_score"], match["home_score"], match["away_score"])
        delta = pts - (p.get("points_awarded") or 0)
        await db.predictions.update_one(
            {"id": p["id"]},
            {"$set": {"points_awarded": pts}},
        )
        if delta != 0:
            await db.users.update_one({"id": p["user_id"]}, {"$inc": {"total_points": delta}})
        count += 1
    return count
