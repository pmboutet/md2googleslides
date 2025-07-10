#!/usr/bin/env node

require('babel-polyfill');

const Promise = require('promise');
const fs = require('fs');
const path = require('path');
const ArgumentParser = require('argparse').ArgumentParser;
const { google } = require('googleapis');
const SlideGenerator = require('../lib/slide_generator').default;
const opener = require('opener');

const SCOPES = [
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive',
];

const parser = new ArgumentParser({
  version: '1.0.0',
  addHelp: true,
  description: 'Markdown to Slides converter',
});

parser.addArgument('file', {
  help: 'Path to markdown file to convert, If omitted, reads from stdin',
  nargs: '?',
});
parser.addArgument(['-u', '--user'], {
  help: 'Email address of user',
  required: false,
  dest: 'user',
  defaultValue: 'default',
});
parser.addArgument(['-a', '--append'], {
  dest: 'id',
  help: 'Appends slides to an existing presentation',
  required: false,
});
parser.addArgument(['-e', '--erase'], {
  dest: 'erase',
  action: 'storeTrue',
  help: 'Erase existing slides prior to appending.',
  required: false,
});
parser.addArgument(['-n', '--no-browser'], {
  action: 'storeTrue',
  dest: 'headless',
  help: 'Headless mode - do not launch browsers, just shows URLs',
  required: false,
});
parser.addArgument(['-s', '--style'], {
  help: 'Name of highlight.js theme for code formatting',
  dest: 'style',
  required: false,
  defaultValue: 'default',
});
parser.addArgument(['-t', '--title'], {
  help: 'Title of the presentation',
  dest: 'title',
  required: false,
});
parser.addArgument(['-c', '--copy'], {
  help: 'Id of the presentation to copy and use as a base',
  dest: 'copy',
  required: false,
});
parser.addArgument(['--use-fileio'], {
  help: 'Acknowledge local and generated images are uploaded to https://file.io',
  action: 'storeTrue',
  dest: 'useFileio',
  required: false,
});

const args = parser.parseArgs();

function handleError(err) {
  console.error('Unable to generate slides:', err);
  process.exit(1);
}

function authorizeUser() {
  const credsPath = '/app/credentials.json';
  const credentials = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));

  const { client_id, client_secret, refresh_token } = credentials;

  if (!client_id || !client_secret || !refresh_token) {
    throw new Error('Missing required credentials: client_id, client_secret, or refresh_token');
  }

  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://localhost' // dummy redirect
  );

  oauth2Client.setCredentials({ refresh_token });

  return oauth2Client.getAccessToken().then(() => oauth2Client);
}

function buildSlideGenerator(authClient) {
  const title = args.title || args.file;
  const presentationId = args.id;
  const copyId = args.copy;

  if (presentationId) {
    return SlideGenerator.forPresentation(authClient, presentationId);
  } else if (copyId) {
    return SlideGenerator.copyPresentation(authClient, title, copyId);
  } else {
    return SlideGenerator.newPresentation(authClient, title);
  }
}

function eraseIfNeeded(slideGenerator) {
  if (args.erase || !args.id) {
    return slideGenerator.erase().then(() => slideGenerator);
  } else {
    return Promise.resolve(slideGenerator);
  }
}

function loadCss(theme) {
  const cssPath = path.join(
    require.resolve('highlight.js'),
    '..',
    '..',
    'styles',
    theme + '.css'
  );
  return fs.readFileSync(cssPath, { encoding: 'UTF-8' });
}

function generateSlides(slideGenerator) {
  let source;
  if (args.file) {
    source = path.resolve(args.file);
    process.chdir(path.dirname(source));
  } else {
    source = 0;
  }
  const input = fs.readFileSync(source, { encoding: 'UTF-8' });
  const css = loadCss(args.style);

  return slideGenerator.generateFromMarkdown(input, {
    css: css,
    useFileio: args.useFileio,
  });
}

function displayResults(id) {
  const url = 'https://docs.google.com/presentation/d/' + id;
  if (args.headless) {
    console.log('View your presentation at: %s', url);
  } else {
    console.log('Opening your presentation (%s)', url);
    opener(url);
  }
}

authorizeUser()
  .then(buildSlideGenerator)
  .then(eraseIfNeeded)
  .then(generateSlides)
  .then(displayResults)
  .catch(handleError);
