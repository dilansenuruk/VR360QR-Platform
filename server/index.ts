import app from './app.ts';

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log(`VR360 QR Platform API listening on http://localhost:${PORT}`);
});
