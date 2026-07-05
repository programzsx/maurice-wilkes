import random
import time


def generate_snowflake_id() -> str:
    ts = int(time.time() * 1000)
    rand = random.randint(10000, 99999)
    return f"{ts}{rand}"


def now_timestamp() -> str:
    return str(int(time.time()))
