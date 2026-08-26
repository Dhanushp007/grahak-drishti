# Synthetic Demo Seed

The deterministic browser demo dataset is defined in `scripts/seed_demo.py`.
It contains five scenario-driven aggregate issue clusters, including the golden
QuickKart refund-delay journey, explicit trend points, state-level summaries,
evidence-backed counts, and advisory routing recommendations.

After applying migrations, seed the configured database with:

```powershell
python -m scripts.seed_demo
```

To intentionally reset demo complaint and intelligence records before reseeding:

```powershell
python -m scripts.seed_demo --reset
```

All records are synthetic and must not be presented as official statistics or
legally verified consumer evidence.