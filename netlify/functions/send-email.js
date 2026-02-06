const nodemailer = require('nodemailer');
const https = require('https');

// Google OAuth2: get access token from service account
const getAccessToken = async () => {
  const crypto = require('crypto');
  const now = Math.floor(Date.now() / 1000);
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  // Parse private key from environment variable
  let rawKey = '';
  if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
    rawKey = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
  } else {
    rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
    rawKey = rawKey.replace(/\\n/g, '\n');
    if (rawKey.startsWith('"') && rawKey.endsWith('"')) {
      try { rawKey = JSON.parse(rawKey); } catch (e) { /* keep as-is */ }
    }
  }

  console.log('Key starts with BEGIN:', rawKey.substring(0, 32));
  console.log('Key length:', rawKey.length);
  console.log('Key has real newlines:', rawKey.includes('\n'));
  console.log('Key ends with:', rawKey.substring(rawKey.length - 40));

  // Use crypto.createPrivateKey to properly parse the PEM regardless of format
  let keyObject;
  try {
    keyObject = crypto.createPrivateKey({
      key: rawKey,
      format: 'pem',
    });
    console.log('Key parsed successfully, type:', keyObject.type, 'asymmetricKeyType:', keyObject.asymmetricKeyType);
  } catch (parseErr) {
    console.error('Failed to parse private key:', parseErr.message);
    throw new Error(`Private key parse error: ${parseErr.message}`);
  }

  // Build JWT header and claim set
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claimSet = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/firebase.auth',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');

  const signInput = `${header}.${claimSet}`;

  // Sign using the parsed key object
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signInput), keyObject).toString('base64url');

  const jwt = `${signInput}.${signature}`;

  // Exchange JWT for access token
  return new Promise((resolve, reject) => {
    const postData = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.access_token) {
            resolve(parsed.access_token);
          } else {
            reject(new Error(`OAuth error: ${data}`));
          }
        } catch (e) {
          reject(new Error(`OAuth parse error: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
};

// Call Google Identity Toolkit REST API to generate action links
const generateActionLink = async (type, email, continueUrl, accessToken) => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const requestType = type === 'verification' ? 'VERIFY_EMAIL' : 'PASSWORD_RESET';

  const body = JSON.stringify({
    requestType,
    email,
    returnOobLink: true,
    continueUrl: type === 'verification' ? `${continueUrl}/?verified=true` : continueUrl,
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'identitytoolkit.googleapis.com',
      path: `/v1/projects/${projectId}/accounts:sendOobCode`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Goog-User-Project': projectId,
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.oobLink) {
            resolve(parsed.oobLink);
          } else {
            reject(new Error(`Identity Toolkit error: ${data}`));
          }
        } catch (e) {
          reject(new Error(`Identity Toolkit parse error: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

// Create reusable SMTP transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

// Email template generator
const getEmailTemplate = (type, lang, data) => {
  const templates = {
    verification: {
      de: {
        subject: 'Bestätigen Sie Ihre E-Mail – Flamenco Werkstatt',
        heading: 'Willkommen!',
        subheading: 'Bitte bestätigen Sie Ihre E-Mail-Adresse',
        intro: `Vielen Dank für Ihre Registrierung bei <strong style="color: #8B0000;">Antonio Dias Flamenco Werkstatt</strong>.`,
        body: `Klicken Sie auf den Button unten, um Ihre E-Mail-Adresse <strong>${data.email || '%EMAIL%'}</strong> zu bestätigen und Ihr Konto zu aktivieren.`,
        buttonText: 'E-Mail bestätigen',
        fallback: 'Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:',
        notice: '<strong style="color: #333333;">Wichtig:</strong> Dieser Link ist nur für eine begrenzte Zeit gültig. Falls Sie sich nicht registriert haben, können Sie diese E-Mail ignorieren.',
        noticeType: 'warning',
        tagline: 'Flamenco mit Leidenschaft und Tradition',
        autoMessage: 'Diese E-Mail wurde automatisch gesendet. Bitte antworten Sie nicht auf diese E-Mail.',
      },
      en: {
        subject: 'Verify your email – Flamenco Werkstatt',
        heading: 'Welcome!',
        subheading: 'Please verify your email address',
        intro: `Thank you for registering with <strong style="color: #8B0000;">Antonio Dias Flamenco Werkstatt</strong>.`,
        body: `Click the button below to verify your email address <strong>${data.email || '%EMAIL%'}</strong> and activate your account.`,
        buttonText: 'Verify Email',
        fallback: 'If the button doesn\'t work, copy and paste this link into your browser:',
        notice: '<strong style="color: #333333;">Important:</strong> This link is only valid for a limited time. If you did not register, you can safely ignore this email.',
        noticeType: 'warning',
        tagline: 'Flamenco with Passion and Tradition',
        autoMessage: 'This email was sent automatically. Please do not reply to this email.',
      },
      es: {
        subject: 'Verifica tu correo – Flamenco Werkstatt',
        heading: '¡Bienvenido/a!',
        subheading: 'Por favor, verifica tu dirección de correo electrónico',
        intro: `Gracias por registrarte en <strong style="color: #8B0000;">Antonio Dias Flamenco Werkstatt</strong>.`,
        body: `Haz clic en el botón de abajo para verificar tu dirección de correo electrónico <strong>${data.email || '%EMAIL%'}</strong> y activar tu cuenta.`,
        buttonText: 'Verificar correo',
        fallback: 'Si el botón no funciona, copia y pega este enlace en tu navegador:',
        notice: '<strong style="color: #333333;">Importante:</strong> Este enlace solo es válido por un tiempo limitado. Si no te has registrado, puedes ignorar este correo.',
        noticeType: 'warning',
        tagline: 'Flamenco con Pasión y Tradición',
        autoMessage: 'Este correo fue enviado automáticamente. Por favor, no respondas a este correo.',
      },
    },
    resetPassword: {
      de: {
        subject: 'Passwort zurücksetzen – Flamenco Werkstatt',
        heading: 'Passwort zurücksetzen',
        subheading: 'Wir haben eine Anfrage zum Zurücksetzen Ihres Passworts erhalten.',
        intro: 'Hallo,',
        body: `Sie haben eine Anfrage zum Zurücksetzen des Passworts für Ihr Konto bei <strong style="color: #8B0000;">Antonio Dias Flamenco Werkstatt</strong> gestellt.<br><br>Klicken Sie auf den Button unten, um ein neues Passwort festzulegen:`,
        buttonText: 'Neues Passwort festlegen',
        fallback: 'Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:',
        notice: '<strong style="color: #8B0000;">Sicherheitshinweis:</strong> Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie bitte diese E-Mail. Ihr Passwort bleibt unverändert.',
        noticeType: 'danger',
        expiry: 'Dieser Link ist nur für eine begrenzte Zeit gültig.',
        tagline: 'Flamenco mit Leidenschaft und Tradition',
        autoMessage: 'Diese E-Mail wurde automatisch gesendet. Bitte antworten Sie nicht auf diese E-Mail.',
      },
      en: {
        subject: 'Reset your password – Flamenco Werkstatt',
        heading: 'Reset Your Password',
        subheading: 'We received a request to reset your password.',
        intro: 'Hello,',
        body: `You have requested to reset the password for your account at <strong style="color: #8B0000;">Antonio Dias Flamenco Werkstatt</strong>.<br><br>Click the button below to set a new password:`,
        buttonText: 'Set New Password',
        fallback: 'If the button doesn\'t work, copy and paste this link into your browser:',
        notice: '<strong style="color: #8B0000;">Security notice:</strong> If you did not request this, please ignore this email. Your password will remain unchanged.',
        noticeType: 'danger',
        expiry: 'This link is only valid for a limited time.',
        tagline: 'Flamenco with Passion and Tradition',
        autoMessage: 'This email was sent automatically. Please do not reply to this email.',
      },
      es: {
        subject: 'Restablecer contraseña – Flamenco Werkstatt',
        heading: 'Restablecer contraseña',
        subheading: 'Hemos recibido una solicitud para restablecer tu contraseña.',
        intro: 'Hola,',
        body: `Has solicitado restablecer la contraseña de tu cuenta en <strong style="color: #8B0000;">Antonio Dias Flamenco Werkstatt</strong>.<br><br>Haz clic en el botón de abajo para establecer una nueva contraseña:`,
        buttonText: 'Establecer nueva contraseña',
        fallback: 'Si el botón no funciona, copia y pega este enlace en tu navegador:',
        notice: '<strong style="color: #8B0000;">Aviso de seguridad:</strong> Si no has solicitado esto, ignora este correo. Tu contraseña permanecerá sin cambios.',
        noticeType: 'danger',
        expiry: 'Este enlace solo es válido por un tiempo limitado.',
        tagline: 'Flamenco con Pasión y Tradición',
        autoMessage: 'Este correo fue enviado automáticamente. Por favor, no respondas a este correo.',
      },
    },
  };

  const t = (templates[type] && templates[type][lang]) || templates[type]?.de || templates.verification.de;
  const link = data.link || '#';

  const noticeColors = t.noticeType === 'danger'
    ? { bg: '#FFEBEE', border: '#C41E3A' }
    : { bg: '#FFF8E1', border: '#D4AF37' };

  return {
    subject: t.subject,
    html: `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F5F5F5;">
  <tr>
    <td align="center" style="padding: 40px 20px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
        <tr>
          <td style="background: linear-gradient(135deg, #8B0000, #C41E3A); border-radius: 12px 12px 0 0; padding: 40px 40px 30px 40px; text-align: center;">
            <div style="margin-bottom: 16px; font-size: 48px;">💃</div>
            <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;">Antonio Dias Flamenco Werkstatt</h1>
            <div style="width: 60px; height: 3px; background-color: #D4AF37; margin: 16px auto 0 auto; border-radius: 2px;"></div>
          </td>
        </tr>
        <tr>
          <td style="background-color: #FFFFFF; padding: 40px; border-left: 1px solid #E0E0E0; border-right: 1px solid #E0E0E0;">
            <h2 style="margin: 0 0 8px 0; color: #333333; font-size: 22px; font-weight: bold;">${t.heading}</h2>
            <h3 style="margin: 0 0 24px 0; color: ${type === 'verification' ? '#333333' : '#666666'}; font-size: ${type === 'verification' ? '18px' : '16px'}; font-weight: ${type === 'verification' ? '600' : 'normal'};">${t.subheading}</h3>
            <p style="margin: 0 0 16px 0; color: #666666; font-size: 16px; line-height: 24px;">${t.intro}</p>
            <p style="margin: 0 0 32px 0; color: #666666; font-size: 16px; line-height: 24px;">${t.body}</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td align="center" style="padding: 0 0 32px 0;">
                  <a href="${link}" target="_blank" style="display: inline-block; background-color: #8B0000; color: #FFFFFF; text-decoration: none; font-size: 16px; font-weight: bold; padding: 16px 48px; border-radius: 8px; letter-spacing: 0.5px;">${t.buttonText}</a>
                </td>
              </tr>
            </table>
            <div style="border-top: 1px solid #E0E0E0; margin: 0 0 24px 0;"></div>
            <p style="margin: 0 0 8px 0; color: #999999; font-size: 13px; line-height: 20px;">${t.fallback}</p>
            <p style="margin: 0 0 24px 0; word-break: break-all;"><a href="${link}" style="color: #8B0000; font-size: 13px; text-decoration: underline;">${link}</a></p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="background-color: ${noticeColors.bg}; border-left: 4px solid ${noticeColors.border}; padding: 16px; border-radius: 0 8px 8px 0;">
                  <p style="margin: 0; color: #666666; font-size: 14px; line-height: 22px;">${t.notice}</p>
                </td>
              </tr>
            </table>
            ${t.expiry ? `<p style="margin: 24px 0 0 0; color: #999999; font-size: 13px; line-height: 20px; text-align: center;">${t.expiry}</p>` : ''}
          </td>
        </tr>
        <tr>
          <td style="background-color: #333333; border-radius: 0 0 12px 12px; padding: 30px 40px; text-align: center;">
            <p style="margin: 0 0 8px 0; color: #D4AF37; font-size: 14px; font-weight: bold; letter-spacing: 0.5px;">Antonio Dias Flamenco Werkstatt</p>
            <p style="margin: 0 0 16px 0; color: #999999; font-size: 12px; line-height: 18px;">${t.tagline}</p>
            <div style="width: 40px; height: 2px; background-color: #D4AF37; margin: 0 auto 16px auto; border-radius: 1px;"></div>
            <p style="margin: 0; color: #777777; font-size: 11px; line-height: 16px;">${t.autoMessage}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`,
  };
};

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { type, email, lang, continueUrl } = JSON.parse(event.body);

    if (!type || !email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing type or email' }) };
    }

    const language = ['de', 'en', 'es'].includes(lang) ? lang : 'de';
    const actionUrl = continueUrl || process.env.APP_URL || 'https://flamenco-werkstatt.netlify.app';

    if (type !== 'verification' && type !== 'resetPassword') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid type. Use "verification" or "resetPassword"' }) };
    }

    // Step 1: Get OAuth2 access token
    console.log('Step 1: Getting OAuth2 access token...');
    const accessToken = await getAccessToken();
    console.log('Step 1: OK - access token obtained');

    // Step 2: Generate action link via Google Identity Toolkit REST API
    console.log(`Step 2: Generating ${type} link for ${email}...`);
    const link = await generateActionLink(type, email, actionUrl, accessToken);
    console.log('Step 2: OK - action link generated');

    // Step 3: Generate email content
    const template = getEmailTemplate(type, language, { email, link });
    console.log('Step 3: OK - template generated, subject:', template.subject);

    // Step 4: Send email via SMTP
    console.log('Step 4: Sending email via SMTP...');
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Flamenco Werkstatt" <${process.env.SMTP_EMAIL}>`,
      replyTo: process.env.REPLY_TO_EMAIL || process.env.SMTP_EMAIL,
      to: email,
      subject: template.subject,
      html: template.html,
    });

    console.log(`Step 4: OK - Email sent: type=${type}, lang=${language}, to=${email}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Email sent successfully' }),
    };
  } catch (error) {
    console.error('Send email error:', error);

    // Handle specific Firebase errors
    if (error.code === 'auth/user-not-found') {
      // Don't reveal if user exists or not (security)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'If the email exists, a message has been sent' }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to send email', details: error.message }),
    };
  }
};
