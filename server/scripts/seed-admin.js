// Usage: npm run seed:admin
// Creates the first super-admin so you can log in to the dashboard.
// Works only once (the API refuses onboarding when a user already exists).
const base = process.env.API_URL || 'http://localhost:5000';
const body = {
    username: process.env.ADMIN_USERNAME || 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
};

const res = await fetch(`${base}/api/auth/onboard-super-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
});
const data = await res.json().catch(() => ({}));
if (res.ok) console.log(`Super admin created. Login with  ${body.username} / ${body.password}`);
else console.log(`Could not create admin (HTTP ${res.status}): ${data.message || 'unknown error'}`);
