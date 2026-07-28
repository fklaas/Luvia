# Luvia Core 4.0.4.4 – Gateway Isolation & Diagnostics Boot Fix

Dieser Hotfix trennt Diagnose-Startpfade vollständig von Remote-Gateway-Aufrufen, ersetzt tiefe globale Service-Diagnosen durch leichte Status-Snapshots und verhindert nicht authentifizierte Recommendation-Tracking-Requests. Zusätzlich wurden nicht notwendige Custom Request Header aus dem Browser-Backend entfernt, damit ältere oder noch nicht aktualisierte CORS-Konfigurationen keine Preflight-Blockaden verursachen.
