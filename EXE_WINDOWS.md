# Windows EXE

This project can be packaged as a Windows desktop app with Electron.

## Build

From the repository root:

```powershell
npm run dist:win
```

Or from `project`:

```powershell
npm run dist:win
```

The generated files are written to:

```txt
project/release/
```

Open:

```txt
project/release/win-unpacked/Clinic Organizer Pro.exe
```

The script builds the frontend with the online Supabase backend:

```env
VITE_SUPABASE_URL=https://vbhjtpjjwxelxzvixjfo.supabase.co
VITE_API_URL=https://vbhjtpjjwxelxzvixjfo.supabase.co/functions/v1/api
```

## Notes

- The EXE is a desktop shell for the same React system.
- The backend still needs to be online in Supabase.
- If the Supabase Edge Function `api` is not deployed, the app opens but CRUD calls will fail.

## Installer

If you want an installer/portable single EXE, run:

```powershell
npm --prefix project run dist:win:installer
```

On Windows, this may require Developer Mode or an elevated terminal because electron-builder extracts signing tools that contain symbolic links.
