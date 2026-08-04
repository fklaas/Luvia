# Luvia 13.28.1.3 / Core 4.28.1.3

## Gallery file picker correction

- Replaced the label-only upload trigger with a real button.
- Added explicit `HTMLInputElement.showPicker()` with `click()` fallback.
- Kept the file input accessible but visually off-screen instead of `display:none`.
- Reset the input value after every selection so the same files can be selected again.
- No database or Edge Function changes.
