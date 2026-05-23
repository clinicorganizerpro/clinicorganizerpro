import app from './app.js';

const port = Number(process.env.PORT || 8788);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on port ${port}`);
});
