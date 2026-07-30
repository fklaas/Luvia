# Deployment – Luvia Build 13.9.1.1

## 1. SQL-Migration

Nicht erforderlich.

## 2. Supabase Edge Function

Erforderlich, damit Gateway-Health und Versionsanzeige Build `13.9.1.1` / Core `4.9.1.1` ausgeben.

Im entpackten Projektordner mit dem Ordner `supabase`:

```bash
supabase functions deploy luvia-gateway
```

Erfolgreich ist der Schritt, wenn die CLI `luvia-gateway` als deployed meldet und der Health-Check Build `13.9.1.1` sowie Core `4.9.1.1` zurückgibt.

## 3. Secrets

Keine neuen Secrets erforderlich.

## 4. Frontend

```bash
git add .
git commit -m "fix(places): harden contract bootstrap and shopping timeline schema"
git push
```

## 5. PWA-Cache

```text
luvia-shell-v13.9.1.1
```

## 6. Neustart

Nach dem vollständigen Frontend-Deployment alle Luvia-Tabs und die installierte PWA schließen und neu öffnen. Bei weiterhin sichtbarem Altstand `force-update.html` einmal ausführen.

## 7. Abnahme

1. Shopping öffnen.
2. Eine Shopping-Detailkarte öffnen.
3. `Zur Timeline` anklicken.
4. Der globale Datums-/Uhrzeitdialog muss sofort erscheinen.
5. Ein Datum speichern und den Eintrag oberhalb der Suche sowie im Dashboard prüfen.
6. Dasselbe mit Fotospot und Sehenswürdigkeit wiederholen.
7. Die Konsole darf weder `undefined.register` noch `kein Timeline-Schema registriert` enthalten.
