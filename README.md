76
]\\\\\\\\\'+//
Name of app: Clockify Chris

App purpose> hold Chris accountable

89m=
A simple personal time tracker, inspired by Clockify. Runs on this computer only.

> **Status:** working prototype.

## Features
- **Timer** — type an optional description, pick a project (or type a new name to create one), press Start / Stop.
- **Manual entries** — add time you forgot to track.
- **Entries list** — newest first, grouped by day, with a total for each day. Entries can be edited and deleted.
- **Download spreadsheet** — download entries for a chosen date range as an Excel (`.xlsx`) file.
- **Local database** — everything is saved in `clockify.db` in this folder.

Weeks start on Monday. Times use the 24-hour format. English only.

## Not included (for now)
Clients, billable hours, rates, tags, reports, project management (rename, colour, archive), logins, and syncing to other devices.

## How it's built
- **Python** with **Flask** — a tiny web server that only this computer can reach (`127.0.0.1`).
- **SQLite** — the database is the single file `clockify.db`.
- Python add-ons live in a private virtual environment outside OneDrive, in `C:\Users\cfbra\AppData\Local\`.

## How to use it
Double-click **Start Clockify.bat**. The app opens in your browser at http://127.0.0.1:5878/. Close the black window to stop the app.

### Setting it up again (for example on a new Python version)
```powershell
python -m venv "$env:LOCALAPPDATA\clockify-bild-ai\venv"
& "$env:LOCALAPPDATA\clockify-bild-ai\venv\Scripts\python.exe" -m pip install -r requirements.txt
```

## Your data
- `clockify.db` holds your time entries. It is kept **out of Git** because it is personal data, not code.
- OneDrive backs up the file. Close the app before shutting down or switching computers, so the file is never synced while it is being written.

## Why it exists
Built as a personal tool, and as a way to learn Git.
This project is part of the BILD-AI training program.
