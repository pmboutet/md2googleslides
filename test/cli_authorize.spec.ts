import mockfs from 'mock-fs';
import {expect} from 'chai';

const ORIGINAL_HOME = process.env.HOME;

function loadCli() {
  delete require.cache[require.resolve('../bin/md2gslides.js')];
  return require('../bin/md2gslides.js');
}

describe('authorizeUser', () => {
  afterEach(() => {
    mockfs.restore();
    delete require.cache[require.resolve('../bin/md2gslides.js')];
    if (ORIGINAL_HOME === undefined) delete process.env.HOME; else process.env.HOME = ORIGINAL_HOME;
  });

  it('throws when client_id.json is missing', () => {
    process.env.HOME = '/tmp/cli-missing';
    const {authorizeUser} = loadCli();
    mockfs({});
    expect(() => authorizeUser()).to.throw(/OAuth client file not found/);
  });

  it('throws when client_id.json is malformed', () => {
    process.env.HOME = '/tmp/cli-malformed';
    const {authorizeUser} = loadCli();
    mockfs({
      '/tmp/cli-malformed/.md2googleslides/client_id.json': 'bad-json'
    });
    expect(() => authorizeUser()).to.throw(/Unexpected token/);
  });

  it('throws when client_id.json lacks client_id or client_secret', () => {
    process.env.HOME = '/tmp/cli-lack';
    const {authorizeUser} = loadCli();
    mockfs({
      '/tmp/cli-lack/.md2googleslides/client_id.json': JSON.stringify({installed: {client_id: 'abc'}})
    });
    expect(() => authorizeUser()).to.throw(/client_id or client_secret/);
  });
});
