"""Portfolio Analytics Router"""
from fastapi import APIRouter, Request
from datetime import datetime, timezone

router = APIRouter(prefix="/api", tags=["portfolio"])


def get_db():
    from routers.deps import db
    return db


async def _get_user(request: Request):
    from server import get_current_user
    return await get_current_user(request)


@router.get("/portfolio/analytics")
async def get_portfolio_analytics(request: Request):
    """Get investment portfolio analytics with ROI and CAGR calculations"""
    user = await _get_user(request)
    db = get_db()
    investments = await db.investments.find({"user_id": user.user_id}, {"_id": 0}).to_list(500)

    total_invested = sum(i.get("invested_amount", 0) for i in investments)
    total_current = sum(i.get("current_value", 0) for i in investments)
    total_gain = total_current - total_invested
    roi_pct = (total_gain / total_invested * 100) if total_invested > 0 else 0

    # Calculate CAGR for each investment
    now = datetime.now(timezone.utc)
    enriched = []
    for inv in investments:
        invested = inv.get("invested_amount", 0)
        current = inv.get("current_value", 0)
        gain = current - invested
        inv_roi = (gain / invested * 100) if invested > 0 else 0

        cagr = 0
        pd_str = inv.get("purchase_date", "")
        if pd_str and invested > 0 and current > 0:
            try:
                pd = datetime.fromisoformat(pd_str.replace("Z", "+00:00"))
                years = max((now - pd).days / 365.25, 0.01)
                cagr = ((current / invested) ** (1 / years) - 1) * 100
            except Exception:
                pass

        enriched.append({
            **inv,
            "gain": round(gain, 2),
            "roi_pct": round(inv_roi, 2),
            "cagr_pct": round(cagr, 2),
        })

    # By type breakdown
    by_type = {}
    for inv in enriched:
        t = inv.get("investment_type", "other")
        if t not in by_type:
            by_type[t] = {"invested": 0, "current": 0, "count": 0}
        by_type[t]["invested"] += inv.get("invested_amount", 0)
        by_type[t]["current"] += inv.get("current_value", 0)
        by_type[t]["count"] += 1

    type_breakdown = []
    for t, v in by_type.items():
        g = v["current"] - v["invested"]
        type_breakdown.append({
            "type": t,
            "invested": round(v["invested"], 2),
            "current": round(v["current"], 2),
            "gain": round(g, 2),
            "roi_pct": round((g / v["invested"] * 100) if v["invested"] > 0 else 0, 2),
            "count": v["count"],
            "allocation_pct": round((v["current"] / total_current * 100) if total_current > 0 else 0, 2),
        })

    return {
        "total_invested": round(total_invested, 2),
        "total_current": round(total_current, 2),
        "total_gain": round(total_gain, 2),
        "overall_roi_pct": round(roi_pct, 2),
        "investment_count": len(investments),
        "type_breakdown": type_breakdown,
        "investments": enriched,
    }
