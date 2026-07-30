# Deployment Build 13.7.1

```bash
supabase functions deploy luvia-gateway
git add .
git commit -m "fix(platform): close gateway auth cors and diagnostics runtime"
git push
```

Erforderlich: Edge Function neu deployen, danach GitHub Pages deployen und PWA einmal vollständig schließen.

Prüfung:
1. Backend Console: Verbindung testen, Health abrufen.
2. Places Explorer: Restaurants, Unterkünfte, Sehenswürdigkeiten einzeln testen.
3. Developer Console: Core/Build = 4.7.1/13.7.1; implementierte Places = ready.
4. Browser-Konsole: keine Luvia-eigenen CORS/400/401/503-Fehler.
