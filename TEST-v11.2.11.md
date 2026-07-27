# Regression tests Luvia 11.2.11

- Create a trip with city, country and dates; close storage and log in incognito: every field is present.
- Edit destination and dates; reload twice and check a second device.
- Simulate a failed Supabase write: the editor must not claim success or replace the local profile.
- Navigate Dashboard → Restaurants repeatedly: the restaurant UI must never remain white.
- Navigate before the module root exists: the delayed mount must populate the view automatically.
