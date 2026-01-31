const admin = require('firebase-admin');

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const emailsArg = getArg('--emails') || getArg('--email');
  const role = getArg('--role');

  if (!emailsArg || !role) {
    console.error('Usage: node scripts/set-custom-claims.js --emails "a@b.com,c@d.com" --role admin|instructor');
    process.exit(1);
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Missing GOOGLE_APPLICATION_CREDENTIALS env var (path to service account JSON).');
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }

  const emails = emailsArg
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  const supported = new Set(['admin', 'instructor']);
  if (!supported.has(role)) {
    console.error('Invalid --role. Use admin or instructor.');
    process.exit(1);
  }

  for (const email of emails) {
    const userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(userRecord.uid, { role });

    // Keep Firestore user doc role in sync (not authoritative for auth decisions)
    await admin.firestore().doc(`users/${userRecord.uid}`).set({ role }, { merge: true });

    console.log(`Set role=${role} for ${email} (uid=${userRecord.uid})`);
  }

  console.log('Done. Users must re-login or refresh ID token to receive new claims.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
