"""Optional documentation plots; requires Matplotlib, never part of the game build."""
import gzip
import json
import os
from pathlib import Path
import statistics
import tempfile

os.environ.setdefault("MPLCONFIGDIR", str(Path(tempfile.gettempdir()) / "cgp-balance-mpl"))
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

root = Path(__file__).resolve().parents[1]
folder = root / "docs/vehicle-balance-v2"
summary = json.loads((folder / "summary.json").read_text())
names = {"bahrain": "Bahrain", "canada": "Kanada", "korea": "Korea", "france": "Frankreich", "england": "England", "russia": "Russland", "italy": "Italien", "japan": "Japan"}
plt.rcParams.update({"font.size": 10, "svg.hashsalt": "carpet-grand-prix-balance-v2", "svg.fonttype": "none", "axes.spines.top": False, "axes.spines.right": False})
colors = ["#8c8171", "#35695f"]

def save(fig, name):
    fig.tight_layout()
    fig.savefig(folder / (name + ".svg"), metadata={"Date": None})
    fig.savefig(folder / (name + ".png"), dpi=170)
    plt.close(fig)

rows = summary["technical"]
fig, ax = plt.subplots(figsize=(9, 5))
for i, version in enumerate(["v1", "v2"]):
    ax.barh([j + (i - .5) * .36 for j in range(len(rows))], [r[version]["spread"] for r in rows], height=.34, color=colors[i], label=version.upper())
ax.set_yticks(range(len(rows)), [names[r["trackId"]] for r in rows])
ax.invert_yaxis()
ax.set_xlabel("Schnellstes bis langsamstes Fahrzeug: Rundendifferenz in Sekunden")
ax.set_title("Technische Streuung – identischer Expert-Fahrregler\nKeine Fahrerunterschiede, kein Verkehr, Windschatten oder Aufholhilfe")
ax.legend()
save(fig, "technical-spread")

fig, ax = plt.subplots(figsize=(9, 5))
for i, version in enumerate(["v1", "v2"]):
    values = [statistics.mean(r[version]["fieldAlone"] for r in summary["races"] if r["trackId"] == t["trackId"]) * 100 for t in rows]
    ax.barh([j + (i - .5) * .36 for j in range(len(rows))], values, height=.34, color=colors[i], label=version.upper())
ax.set_yticks(range(len(rows)), [names[r["trackId"]] for r in rows])
ax.invert_yaxis()
ax.set_xlim(0, 100)
ax.set_xlabel("Zeitanteil ohne aktiven Gegner innerhalb 30 m (%)")
ax.set_title("Alleinfahrt des gesamten Feldes\nMittel über 13 Fahrer, zwei Seeds und beide Hilfebedingungen")
ax.legend()
save(fig, "field-alone")

fig, ax = plt.subplots(figsize=(9, 4.8))
for i, version in enumerate([1, 2]):
    data = json.loads(gzip.decompress((folder / f"races-v{version}.json.gz").read_bytes()))
    races = [r for r in data["weekends"] if r["trackId"] == "bahrain" and r["condition"] == "natural"]
    x, y, lower, upper = [], [], [], []
    for bucket in range(20):
        seed_values = []
        for race in races:
            finish = race["order"][0]["finishTime"]
            gaps = [n["seconds"] for s in race["samples"] if s["time"] >= 8 and len(s["neighbors"]) == 12 and bucket / 20 <= s["time"] / finish < (bucket + 1) / 20 for n in s["neighbors"] if n["seconds"] is not None]
            if gaps:
                seed_values.append(statistics.median(gaps))
        if seed_values:
            x.append((bucket + .5) * 5)
            y.append(statistics.mean(seed_values))
            lower.append(min(seed_values))
            upper.append(max(seed_values))
    ax.plot(x, y, color=colors[i], label=f"V{version}", linewidth=2)
    ax.fill_between(x, lower, upper, color=colors[i], alpha=.14)
ax.set_xlim(0, 100)
ax.set_ylim(bottom=0)
ax.set_xlabel("Vergangene Rennzeit relativ zum Zieleinlauf des Siegers (%)")
ax.set_ylabel("Median tatsächlicher Nachbarabstände (s)")
ax.set_title("Bahrain: Entwicklung der Abstände bei noch 13 aktiven Fahrzeugen\nWindschatten an, Aufholhilfe aus; Band = Spannweite der zwei Seeds")
ax.legend()
save(fig, "bahrain-gaps")
