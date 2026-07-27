LUVIA INTELLIGENCE CORE V2.8.0 – PLATFORM LAYER FOUNDATION

Ziel:
Browser- und Gerätefunktionen werden zentral über window.LuviaPlatform bereitgestellt.
Neue Core-Komponenten und spätere V2-Module sollen nicht direkt auf Browser-APIs zugreifen.

Öffentliche Services:
LuviaPlatform.environment
LuviaPlatform.device
LuviaPlatform.storage
LuviaPlatform.network
LuviaPlatform.lifecycle
LuviaPlatform.navigation
LuviaPlatform.clipboard
LuviaPlatform.sharing
LuviaPlatform.location
LuviaPlatform.permissions
LuviaPlatform.notifications
LuviaPlatform.files

Wichtig:
Supabase bleibt die maßgebliche Datenquelle. Platform Storage ist nur für Cache, Offline-Puffer,
temporäre Einstellungen und technische Zustände vorgesehen.
