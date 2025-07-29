import path from 'path';
import jsonfile from 'jsonfile';
import nock from 'nock';
import {expect} from 'chai';
import {OAuth2Client} from 'google-auth-library';
import {ensureMarkers} from '../src/deck_import';

function creds(): OAuth2Client {
  const c = new OAuth2Client('test', 'test');
  c.setCredentials({access_token: 'abc'});
  return c;
}

describe('ensureMarkers', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'mock_presentation.json');
  const presentation = jsonfile.readFileSync(fixturePath);

  beforeEach(() => {
    nock('https://slides.googleapis.com')
      .get('/v1/presentations/12345')
      .twice()
      .reply(200, presentation);
    nock('https://slides.googleapis.com')
      .post('/v1/presentations/12345:batchUpdate')
      .reply(200, {});
  });

  afterEach(() => nock.cleanAll());

  it('adds markers and returns presentation info', async () => {
    const info = await ensureMarkers(creds(), '12345');
    expect(info.slides).to.have.length(3);
    expect(info.layouts).to.be.an('array');
    expect(info.slides[0]).to.have.property('placeholders');
    expect(info.slides[0]).to.have.property('elements');
    expect(nock.isDone()).to.be.true;
  });
});
