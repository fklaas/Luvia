# Deployment 13.1.3.6

Keine neue Migration und kein Edge-Function-Deployment erforderlich. Voraussetzung: Migration `20260728_024_core_v4_1_3_4_universal_schedule_persistence.sql` wurde ausgeführt.

```bash
git add .
git commit -m "fix(schedule): persist timeline immediately and remove hydration races"
git push
```
