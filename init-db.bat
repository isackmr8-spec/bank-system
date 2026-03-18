@echo off
echo Initializing Banking Database...
cd /d "c:/Users/MR SMILEY/Pictures/bank"
mkdir db 2>nul
sqlite3 db/bank.db < db/schema.sql
sqlite3 db/bank.db < db/seed.sql
echo ✅ Database initialized with sample data.
pause
