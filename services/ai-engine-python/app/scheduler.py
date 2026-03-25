from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler


scheduler = BackgroundScheduler()


def heartbeat() -> None:
    print(f"[AI-ENGINE] heartbeat at {datetime.now().isoformat()}")


def collect_demands() -> None:
    print(f"[AI-ENGINE] collect demands at {datetime.now().isoformat()}")


def run_matching() -> None:
    print(f"[AI-ENGINE] run matching at {datetime.now().isoformat()}")


def setup_jobs() -> None:
    scheduler.add_job(heartbeat, "interval", minutes=5, id="heartbeat")
    scheduler.add_job(collect_demands, "interval", hours=6, id="collect-demands")
    scheduler.add_job(run_matching, "cron", hour=1, minute=0, id="nightly-matching")
    scheduler.start()

