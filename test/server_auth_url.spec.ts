import mockfs from 'mock-fs';
import {expect} from 'chai';

const ORIGINAL_HOME = process.env.HOME;

function loadServer() {
  delete require.cache[require.resolve('../server')];
  return require('../server');
}

describe('generateAuthUrl', () => {
  afterEach(() => {
    mockfs.restore();
    delete require.cache[require.resolve('../server')];
    if (ORIGINAL_HOME === undefined) delete process.env.HOME; else process.env.HOME = ORIGINAL_HOME;
  });

  it('returns null when client_id.json is missing', () => {
    process.env.HOME = '/tmp/testhome-missing';
    const {generateAuthUrl} = loadServer();
    mockfs({});
    const url = generateAuthUrl('user@example.com');
    expect(url).to.be.null;
  });

  it('returns null when client_id.json is malformed', () => {
    process.env.HOME = '/tmp/testhome-malformed';
    const {generateAuthUrl} = loadServer();
    mockfs({
      '/tmp/testhome-malformed/.md2googleslides/client_id.json': 'not-json'
    });
    const url = generateAuthUrl('user@example.com');
    expect(url).to.be.null;
  });

  it('returns null when client_id.json lacks client_id or client_secret', () => {
    process.env.HOME = '/tmp/testhome-lack';
    const {generateAuthUrl} = loadServer();
    mockfs({
      '/tmp/testhome-lack/.md2googleslides/client_id.json': JSON.stringify({installed: {client_id: 'abc'}})
    });
    const url = generateAuthUrl('user@example.com');
    expect(url).to.be.null;
  });
});
