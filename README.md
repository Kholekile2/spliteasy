# SplitEasy 💸

A web app for splitting expenses with friends, housemates, or anyone you share costs with. You create a group, add expenses, and the app figures out who owes who and how much — so you don't have to do the maths yourself.

Live app 👉 https://spliteasy-alpha.vercel.app

---

## What it does

- **Create groups** — make a group for a trip, a flat, a night out, whatever
- **Invite members** — add people to your group by their email address
- **Log expenses** — record who paid, how much, and what it was for
- **Auto split** — the app splits every expense equally among all group members automatically
- **Settlement summary** — instead of showing you 10 different debts, the app simplifies it down to the minimum number of payments needed to settle everything
- **Settle up** — when someone pays their debt, mark it as settled and the balances update
- **Real-time updates** — when someone in your group adds an expense, it shows up on everyone's screen without refreshing
- **Expense categories** — tag expenses as Food, Transport, Accommodation, etc.
- **Group stats** — see total spent, who paid the most, and a breakdown by category
- **Export to PDF** — download a full summary of the group's expenses
- **Deletion history** — if someone deletes an expense, the group can see who deleted it and when
- **Delete account** — users can permanently delete their account and all their data

---

## The part I'm most proud of

The debt simplification algorithm. When a group has been splitting expenses for a while, you can end up with a mess of debts going in all directions. Instead of showing every single debt, the app calculates each person's net balance (what they paid minus what they owe) and then uses a greedy matching algorithm to figure out the smallest number of transactions that settles everything.

So instead of:
- Alex pays Bongani R50
- Bongani pays Chidi R80
- Chidi pays Alex R30

You just get:
- Bongani pays Alex R50

Much simpler. I implemented this from scratch in C# on the backend and it was genuinely the most interesting thing I built in this project.

---

## Tech stack

| Part | Technology |
|------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | ASP.NET Core (.NET 9), C#, Minimal APIs |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Real-time | Supabase Realtime |
| Frontend hosting | Vercel |
| Backend hosting | Railway |

---

## How to run it locally

You'll need Node.js, .NET 9, and a Supabase project.

**Clone the repo**
```bash
git clone https://github.com/Kholekile2/spliteasy.git
cd spliteasy
```

**Set up the frontend**
```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend` folder:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:5152
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Then start it:
```bash
npm run dev
```

**Set up the backend**
```bash
cd backend
```

Create an `appsettings.Development.json` file in the `backend` folder:
```json
{
  "Supabase": {
    "Url": "your_supabase_url",
    "AnonKey": "your_supabase_anon_key",
    "ServiceRoleKey": "your_supabase_service_role_key"
  }
}
```

Then start it:
```bash
dotnet run
```

**Set up the database**

Run the SQL files in order in your Supabase SQL editor to create the tables, policies, and triggers. The full schema is in the project documentation in the `docs` folder.

---

## Project structure

```
spliteasy/
  frontend/     Next.js app
  backend/      ASP.NET Core API
  docs/         Phase documentation (one doc per phase)
```

---

## What I learned building this

This was my second full-stack project and I learned a lot. A few things that stand out:

- How to structure a monorepo with a separate frontend and backend
- How Supabase Row Level Security works and why it matters
- How to implement a real algorithm (debt simplification) rather than just CRUD
- How Supabase Realtime works and why it can be tricky with server-side inserts
- How to deploy a Next.js app to Vercel and a .NET API to Railway
- How to debug production issues that don't show up locally

---

## Built by

Kholekile Mpengesi