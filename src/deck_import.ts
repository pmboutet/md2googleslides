import {google, slides_v1 as SlidesV1} from 'googleapis';
import {OAuth2Client} from 'google-auth-library';
import Debug from 'debug';

export interface PlaceholderMeta {
  objectId: string;
  type?: string;
  text?: string;
  transform?: SlidesV1.Schema$AffineTransform;
  size?: SlidesV1.Schema$Size;
}

export interface LayoutMeta {
  objectId: string;
  name?: string;
  displayName?: string;
  placeholders: PlaceholderMeta[];
}

export interface SlideMeta {
  objectId: string;
  layout?: string;
  title?: string;
  index: number;
  placeholders: PlaceholderMeta[];
}

export interface PresentationMeta {
  presentationId: string;
  title?: string;
  layouts: LayoutMeta[];
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

  const layouts: LayoutMeta[] = [];
  presentation.layouts?.forEach(l => {
    const placeholders: PlaceholderMeta[] = [];
    l.pageElements?.forEach(el => {
      if (el.shape?.placeholder) {
        const text = el.shape.text?.textElements
          ?.map(te => te.textRun?.content ?? '')
          .join('')
          .trim();
        placeholders.push({
          objectId: el.objectId ?? '',
          type: el.shape.placeholder.type || undefined,
          text: text || undefined,
          transform: el.transform,
          size: el.size,
        });
      }
    });
    layouts.push({
      objectId: l.objectId ?? '',
      name: l.layoutProperties?.name || undefined,
      displayName: l.layoutProperties?.displayName || undefined,
      placeholders,
    });
  });

  const slides: SlideMeta[] = [];
  presentation.slides?.forEach((slide, idx) => {
    const layoutId = slide.slideProperties?.layoutObjectId;
    const layout = presentation.layouts?.find(l => l.objectId === layoutId);
    let title: string | undefined;
    const titleElement = slide.pageElements?.find(el =>
      el.shape?.placeholder?.type === 'TITLE'
    );
    const textContent = titleElement?.shape?.text?.textElements
      ?.map(te => te.textRun?.content ?? '')
      .join('');
    if (textContent) {
      title = textContent.trim();
    }

    const placeholders: PlaceholderMeta[] = [];
    slide.pageElements?.forEach(el => {
      if (el.shape?.placeholder) {
        const text = el.shape.text?.textElements
          ?.map(te => te.textRun?.content ?? '')
          .join('')
          .trim();
        placeholders.push({
          objectId: el.objectId ?? '',
          type: el.shape.placeholder.type || undefined,
          text: text || undefined,
          transform: el.transform,
          size: el.size,
        });
      }
    });

    slides.push({
      objectId: slide.objectId ?? '',
      layout: layout?.layoutProperties?.displayName || undefined,
      title,
      index: idx,
      placeholders,
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
