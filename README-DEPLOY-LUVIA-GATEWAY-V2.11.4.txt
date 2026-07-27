LUVIA GATEWAY V2.11.4 DEPLOY

Im entpackten Projektordner ausführen:

npx supabase@latest functions deploy luvia-gateway --use-api

Danach Cloudflare mit Build 9.18.5 aktualisieren. In Luvia anschließend „Ziel neu auflösen“ anklicken. Der Request wird nun garantiert ohne alten Destination-Cache ausgeführt.
