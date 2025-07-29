import nock from 'nock';
import {expect} from 'chai';
import {OAuth2Client} from 'google-auth-library';
import {copySlide, editSlide} from '../src/deck_import';

function creds(): OAuth2Client {
  const c = new OAuth2Client('test', 'test');
  c.setCredentials({access_token: 'abc'});
  return c;
}

describe('slide actions', () => {
  afterEach(() => nock.cleanAll());

  it('copies a slide', async () => {
    nock('https://slides.googleapis.com')
      .post('/v1/presentations/src123:batchUpdate')
      .reply(200, {replies: [{duplicateObject: {objectId: 'new123'}}]});

    const id = await copySlide(creds(), 'src123', 'slideA');
    expect(id).to.equal('new123');
    expect(nock.isDone()).to.be.true;
  });

  it('edits a slide', async () => {
    nock('https://slides.googleapis.com')
      .post('/v1/presentations/pres1:batchUpdate')
      .reply(200, {});

    await editSlide(creds(), 'pres1', [
      {elementId: 'el1', text: 'ok'},
    ]);
    expect(nock.isDone()).to.be.true;
  });
});
