import {google, slides_v1 as SlidesV1} from 'googleapis';
import {OAuth2Client} from 'google-auth-library';
import Debug from 'debug';

export interface SlideMeta {
  objectId: string;
  layout?: string;
  title?: string;
  index: number;
}

export interface PresentationMeta {
  presentationId: string;
  title?: string;
  layouts: string[];
  slides: SlideMeta[];
}

const debug = Debug('md2gslides');
const MARKER_PREFIX = 'md2gs-slide:';

export async function ensureMarkers(
  oauth2Client: OAuth2Client,
  presentationId: string
): Promise<PresentationMeta> {
  const api = google.slides({version: 'v1', auth: oauth2Client});
  const res = await api.presentations.get({presentationId});
  const presentation = res.data;
  const requests: SlidesV1.Schema$Request[] = [];

  presentation.slides?.forEach((slide, idx) => {
    const notesPage = slide.slideProperties?.notesPage;
    const speakerObjectId = notesPage?.notesProperties?.speakerNotesObjectId;
    if (!speakerObjectId) {
      return;
    }
    const hasMarker = notesPage.pageElements?.some(el =>
      el.shape?.text?.textElements?.some(te =>
        te.textRun?.content?.startsWith(MARKER_PREFIX)
      )
    );
    if (!hasMarker) {
      requests.push({
        insertText: {
          objectId: speakerObjectId,
          text: `${MARKER_PREFIX}${idx}\n`,
          insertionIndex: 0,
        },
      });
    }
  });

  if (requests.length) {
    await api.presentations.batchUpdate({
      presentationId,
      requestBody: {requests},
    });
    const updated = await api.presentations.get({presentationId});
    Object.assign(presentation, updated.data);
  }

  const layouts = presentation.layouts?.map(l => l.layoutProperties?.name ?? '') ?? [];
  const slides: SlideMeta[] = [];
  presentation.slides?.forEach((slide, idx) => {
    const layoutId = slide.slideProperties?.layoutObjectId;
    const layout = presentation.layouts?.find(l => l.objectId === layoutId);
    let title: string | undefined;
    const titleElement = slide.pageElements?.find(el =>
      el.shape?.placeholder?.type === 'TITLE'
    );
    const textContent = titleElement?.shape?.text?.textElements?.map(te => te.textRun?.content ?? '').join('');
    if (textContent) {
      title = textContent.trim();
    }
    slides.push({
      objectId: slide.objectId ?? '',
      layout: layout?.layoutProperties?.displayName || undefined,
      title,
      index: idx,
    });
  });

  debug('Presentation meta: %O', {slides, layouts});
  return {
    presentationId: presentation.presentationId ?? presentationId,
    title: presentation.title ?? undefined,
    layouts,
    slides,
  };
}
