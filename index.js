// 명함 스캐너 PWA를 위한 프록시 서버
// Google Gemini API 키를 서버에만 보관하고, 앱은 이 서버를 통해서만 호출합니다.
// Gemini API 무료 등급(Google AI Studio 발급 키)은 카드 등록 없이 사용 가능합니다.

const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors()); // 필요하면 특정 origin만 허용하도록 좁힐 수 있습니다.
app.use(express.json({ limit: '15mb' })); // 명함 사진 base64를 담기 위해 넉넉히 설정

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const APP_SECRET = process.env.APP_SECRET || '';

const PROMPT = `이 명함 이미지를 읽고 정보를 아래 JSON 형식으로만 응답하세요. 다른 설명 없이 순수 JSON만 출력하세요. 값이 없으면 빈 문자열이나 빈 배열로 두세요.
{
  "name": "",
  "company": "",
  "title": "",
  "phones": [{"label": "휴대전화", "number": ""}],
  "emails": [""],
  "address": "",
  "website": ""
}
phones의 label은 "휴대전화", "회사전화", "팩스" 중 문맥에 맞게 고르세요.`;

// UptimeRobot 등으로 깨워둘 때 사용할 헬스체크
app.get('/', (req, res) => {
  res.send('card-scanner-proxy: ok (gemini)');
});

app.post('/scan-card', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: '서버에 GEMINI_API_KEY가 설정되어 있지 않습니다.' });
    }
    if (APP_SECRET && req.headers['x-app-secret'] !== APP_SECRET) {
      return res.status(401).json({ error: '인증에 실패했습니다.' });
    }

    const { imageBase64, mediaType } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: '이미지 데이터가 없습니다.' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              {
                inline_data: {
                  mime_type: mediaType || 'image/jpeg',
                  data: imageBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 512,
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      })
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      const message = (data && data.error && data.error.message) || 'Gemini API 오류';
      return res.status(geminiRes.status).json({ error: message });
    }

    const candidate = data.candidates && data.candidates[0];
    const text = candidate && candidate.content && candidate.content.parts
      ? candidate.content.parts.map((p) => p.text || '').join('').trim()
      : '';

    if (!text) {
      return res.status(500).json({ error: '명함 인식 결과가 비어 있습니다.' });
    }

    const clean = text.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      return res.status(500).json({ error: '명함 인식 결과를 해석하지 못했습니다.' });
    }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message || '서버 오류가 발생했습니다.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`card-scanner-proxy (gemini) listening on ${PORT}`);
});
