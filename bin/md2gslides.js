#!/usr/bin/env node

// Copyright 2016 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* eslint-disable no-console, @typescript-eslint/no-var-requires */

require('core-js/stable');

const Promise = require('promise');
const fs = require('fs');
const path = require('path');
const ArgumentParser = require('argparse').ArgumentParser;
const UserAuthorizer = require('../lib/auth').default;
const SlideGenerator = require('../lib/slide_generator').default;
const opener = require('opener');
const readline = require('readline');

const SCOPES = [
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive',
];

const USER_HOME =
  process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
const STORED_CREDENTIALS_PATH = path.join(
  USER_HOME,
  '.md2googleslides',
  'credentials.json'
);
const STORED_CLIENT_ID_PATH = path.join(
  USER_HOME,
  '.md2googleslides',
  'client_id.json'
);

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
parser.addArgument(['-d', '--dry-run'], {
  help: 'Parse input without calling Google APIs',
  action: 'storeTrue',
  dest: 'dryRun',
  required: false,
});

const args = require.main === module ? parser.parseArgs() : parser.parseArgs([]);

function handleError(err) {
  console.log('Unable to generate slides:', err);
}

function prompt(url) {
  if (args.headless) {
    console.log('Authorize this app by visiting this url: ');
    console.log(url);
  } else {
    console.log('Authorize this app in your browser.');
    console.log('\n\uD83D\uDC49 Open this URL to authorize the app:\n' + url + '\n');
    opener(url);
    console.log('\nIf the browser shows a connection error, copy the "code" parameter');
    console.log('from the address bar and paste it below.');
  }
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('Enter the code here: ', code => {
      rl.close();
      code = code.trim();
      if (code.length > 0) {
        resolve(code);
      } else {
        reject(new Error('No code provided'));
      }
    });
  });
}

function authorizeUser() {
  // Google OAuth2 clients always have a secret, even for tools like this one.
  // The credentials may be of type "Web application" or "Installed" but in both
  // cases the secret is effectively public; security relies on refresh tokens,
  // which become bearer tokens.

  // Load and parse client ID and secret from client_id.json file. (Create
  // OAuth client ID from Credentials tab at console.developers.google.com
  // and download the credentials as client_id.json to ~/.md2googleslides
  let data; // needs to be scoped outside of try-catch
  try {
    if (!fs.existsSync(STORED_CLIENT_ID_PATH)) {
      throw new Error(`OAuth client file not found at ${STORED_CLIENT_ID_PATH}`);
    }
    data = fs.readFileSync(STORED_CLIENT_ID_PATH);
  } catch (err) {
    console.log('Error loading client secret file:', err.message);
    throw err;
  }
  if (data === undefined) {
    console.log('Error loading client secret data');
    throw new Error('No client secret found.');
  }
  let parsed;
  try {
    parsed = JSON.parse(data);
  } catch (err) {
    console.log('Invalid JSON in client secret file:', err.message);
    throw err;
  }
  const creds = parsed.web || parsed.installed;
  if (!creds) {
    throw new Error('Credentials missing "web" or "installed" section');
  }
  if (!creds.client_id || !creds.client_secret) {
    throw new Error('Credentials missing client_id or client_secret');
  }

  // Authorize user and get (& store) a valid access token.
  const options = {
    clientId: creds.client_id,
    clientSecret: creds.client_secret,
    filePath: STORED_CREDENTIALS_PATH,
    prompt: prompt,
  };
  const auth = new UserAuthorizer(options);
  return auth.getUserCredentials(args.user, SCOPES);
}

function buildSlideGenerator(oauth2Client) {
  const title = args.title || args.file;
  const presentationId = args.id;
  const copyId = args.copy;

  if (presentationId) {
    return SlideGenerator.forPresentation(oauth2Client, presentationId);
  } else if (copyId) {
    return SlideGenerator.copyPresentation(oauth2Client, title, copyId);
  } else {
    return SlideGenerator.newPresentation(oauth2Client, title);
  }
}

function eraseIfNeeded(slideGenerator) {
  if (args.erase || !args.id) {
    return slideGenerator.erase().then(() => {
      return slideGenerator;
    });
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
  const css = fs.readFileSync(cssPath, {encoding: 'UTF-8'});
  return css;
}

function generateSlides(slideGenerator) {
  let source;
  if (args.file) {
    source = path.resolve(args.file);
    // Set working directory relative to markdown file
    process.chdir(path.dirname(source));
  } else {
    source = 0;
  }
  const input = fs.readFileSync(source, {encoding: 'UTF-8'});
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
if (require.main === module) {
  if (args.dryRun) {
    try {
      let source;
      if (args.file) {
        source = path.resolve(args.file);
        process.chdir(path.dirname(source));
      } else {
        source = 0;
      }
      const input = fs.readFileSync(source, {encoding: 'UTF-8'});
      const css = loadCss(args.style);
      require('../lib/parser/extract_slides').default(input, css);
      console.log('Dry run successful - no slides created.');
    } catch (err) {
      handleError(err);
      process.exitCode = 1;
    }
  } else {
    authorizeUser()
      .then(buildSlideGenerator)
      .then(eraseIfNeeded)
      .then(generateSlides)
      .then(displayResults)
      .catch(handleError);
  }
}

module.exports = {authorizeUser};
