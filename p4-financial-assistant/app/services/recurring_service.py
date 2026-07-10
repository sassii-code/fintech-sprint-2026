import statistics
from datetime import date, timedelta
from rapidfuzz import fuzz
from sqlalchemy.orm import Session
from app.models.database import Account, Transaction, RecurringTransaction

DESCRIPTION_SIMILARITY_THRESHOLD = 80  # rapidfuzz token_set_ratio, 0-100
AMOUNT_VARIANCE_TOLERANCE = 0.05  # 5%, per spec

# (label, target interval in days, tolerance in days)
FREQUENCY_BUCKETS: list[tuple[str, int, int]] = [
    ("weekly", 7, 3),
    ("monthly", 30, 8),
    ("yearly", 365, 35),
]


def _classify_frequency(avg_interval_days: float) -> str | None:
    for label, target, tolerance in FREQUENCY_BUCKETS:
        if abs(avg_interval_days - target) <= tolerance:
            return label
    return None


def _label_matches(t: Transaction, cluster: dict) -> bool:
    """Prefer the Gemini-normalized merchant (exact match) since it already
    collapses noisy statement text like 'NETFLIX.COM', 'Netflix Subscription',
    and 'Netflix.com 866-579-7172' down to the same 'Netflix'. Raw-description
    fuzzy matching is only a fallback for transactions with no merchant
    assigned (e.g. generic transfers), and uses token_set_ratio rather than
    token_sort_ratio — set-based comparison tolerates one description being a
    shorter/longer variant of the other (subset of tokens), which sort-based
    comparison penalizes heavily even for obviously-the-same merchant."""
    if t.merchant and cluster["merchant_rep"]:
        return t.merchant.strip().lower() == cluster["merchant_rep"].strip().lower()
    score = fuzz.token_set_ratio(t.description.lower(), cluster["desc_rep"].lower())
    return score >= DESCRIPTION_SIMILARITY_THRESHOLD


def _cluster_transactions(transactions: list[Transaction]) -> list[list[Transaction]]:
    """Greedy clustering: a transaction joins the first existing cluster whose
    merchant/description matches (see _label_matches) and whose running average
    amount is within 5%; otherwise it starts a new cluster. O(n * clusters),
    fine at personal-finance transaction volumes."""
    clusters: list[dict] = []
    for t in sorted(transactions, key=lambda x: x.date):
        placed = False
        for cluster in clusters:
            if cluster["type"] != t.type:
                continue
            amount_avg = cluster["amount_avg"]
            within_amount = amount_avg > 0 and abs(t.amount - amount_avg) / amount_avg <= AMOUNT_VARIANCE_TOLERANCE
            if _label_matches(t, cluster) and within_amount:
                cluster["members"].append(t)
                n = len(cluster["members"])
                cluster["amount_avg"] = (amount_avg * (n - 1) + t.amount) / n
                placed = True
                break
        if not placed:
            clusters.append({
                "members": [t],
                "desc_rep": t.description,
                "merchant_rep": t.merchant,
                "amount_avg": t.amount,
                "type": t.type,
            })
    return [c["members"] for c in clusters]


def _analyze_cluster(members: list[Transaction]) -> dict | None:
    members = sorted(members, key=lambda t: t.date)
    dates = [m.date for m in members]
    intervals = [(dates[i + 1] - dates[i]).days for i in range(len(dates) - 1)]
    if not intervals:
        return None

    avg_interval = sum(intervals) / len(intervals)
    frequency = _classify_frequency(avg_interval)
    if frequency is None:
        return None

    tolerance = next(tol for label, _, tol in FREQUENCY_BUCKETS if label == frequency)
    consistency = statistics.pstdev(intervals) if len(intervals) > 1 else 0.0
    if consistency > tolerance:
        return None  # intervals land near the bucket on average but aren't actually periodic

    amounts = [m.amount for m in members]
    last_seen: date = dates[-1]

    return {
        "account_id": members[0].account_id,
        "merchant": members[-1].merchant or members[-1].description,
        "amount": round(sum(amounts) / len(amounts), 2),
        "type": members[0].type,
        "frequency": frequency,
        "occurrence_count": len(members),
        "last_seen_date": last_seen,
        "next_expected_date": last_seen + timedelta(days=round(avg_interval)),
        "total_spent_lifetime": round(sum(amounts), 2),
        "transaction_ids": ",".join(str(m.id) for m in members),
    }


def _persist(db: Session, account_ids: list[int], results: list[dict]) -> None:
    """Replaces this client's stored recurring patterns with the freshly detected
    set, so other endpoints can read RecurringTransaction directly without
    re-running detection."""
    db.query(RecurringTransaction).filter(RecurringTransaction.account_id.in_(account_ids)).delete(synchronize_session=False)
    for r in results:
        db.add(RecurringTransaction(**r))
    db.commit()


def detect_recurring(db: Session, client_id: str) -> list[dict]:
    account_ids = [a.id for a in db.query(Account).filter(Account.client_id == client_id).all()]
    if not account_ids:
        return []

    transactions = db.query(Transaction).filter(Transaction.account_id.in_(account_ids)).all()
    if len(transactions) < 2:
        _persist(db, account_ids, [])
        return []

    by_account: dict[int, list[Transaction]] = {}
    for t in transactions:
        by_account.setdefault(t.account_id, []).append(t)

    results = []
    for members_by_account in by_account.values():
        for cluster in _cluster_transactions(members_by_account):
            if len(cluster) < 2:
                continue
            analyzed = _analyze_cluster(cluster)
            if analyzed:
                results.append(analyzed)

    results.sort(key=lambda r: r["total_spent_lifetime"], reverse=True)
    _persist(db, account_ids, results)
    return results
