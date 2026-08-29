# Synthetic Demo Seed

The deterministic browser demo dataset is defined in `scripts/seed_demo.py`.
It contains 2,000 actual complaint and analysis records across ten issue
niches, twenty aggregate clusters, 600 consumers, thirty merchants, forty
signals, state-level summaries, evidence metadata, and advisory routing
recommendations. The golden QuickKart refund-delay journey is included.

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

Validate a migrated and seeded database with:

```powershell
python -m scripts.validate_demo_data
```