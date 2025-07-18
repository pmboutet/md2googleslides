const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({limit: '10mb'}));

/**
 * Simulate conversion using the CLI. In a real deployment this could call
 * bin/md2gslides.js with proper arguments and credentials. For now we simply
 * generate a fake presentation id and url.
 */
function convertMarkdown(markdown, title) {
  // Placeholder logic - in a full implementation we would invoke the generator
  const hash = Buffer.from(`${markdown}-${title}`).toString('base64').slice(0, 8);
  const id = `sim-${hash}`;
  const url = `https://docs.example.com/presentation/d/${id}`;
  return Promise.resolve({presentationId: id, presentationUrl: url});
}

app.post('/convert-text', async (req, res) => {
  const {markdown, title} = req.body || {};
  if (!markdown) {
    return res.status(400).json({error: 'markdown is required'});
  }
  try {
    const result = await convertMarkdown(markdown, title || 'Untitled');
    res.json({
      presentation_id: result.presentationId,
      presentation_url: result.presentationUrl,
    });
  } catch (err) {
    console.error('conversion error', err);
    res.status(500).json({error: 'conversion failed'});
  }
});

app.get('/health', (req, res) => {
  res.json({status: 'ok'});
});

app.listen(port, () => {
  console.log(`Slides service running on port ${port}`);
});

module.exports = app;
