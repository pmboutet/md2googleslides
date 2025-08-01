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

export interface ElementMeta {
  objectId: string;
  elementType: string;
  placeholderType?: string;
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
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
  elements: ElementMeta[];
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
    const elements: ElementMeta[] = [];
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

      const elem: ElementMeta = {
        objectId: el.objectId ?? '',
        elementType: el.shape
          ? 'shape'
          : el.image
          ? 'image'
          : el.video
          ? 'video'
          : el.table
          ? 'table'
          : el.line
          ? 'line'
          : el.sheetsChart
          ? 'sheetsChart'
          : el.wordArt
          ? 'wordArt'
          : el.elementGroup
          ? 'group'
          : 'unknown',
        placeholderType:
          el.shape?.placeholder?.type || el.image?.placeholder?.type || undefined,
        transform: el.transform,
        size: el.size,
      };

      if (el.shape) {
        const text = el.shape.text?.textElements
          ?.map(te => te.textRun?.content ?? '')
          .join('')
          .trim();
        if (text) {
          elem.text = text;
        }
      }
      if (el.image) {
        elem.imageUrl = el.image.sourceUrl || el.image.contentUrl || undefined;
      }
      if (el.video) {
        elem.videoUrl = el.video.url || undefined;
      }

      elements.push(elem);
    });

    slides.push({
      objectId: slide.objectId ?? '',
      layout: layout?.layoutProperties?.displayName || undefined,
      title,
      index: idx,
      placeholders,
      elements,
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

export async function copySlide(
  oauth2Client: OAuth2Client,
  presentationId: string,
  slideId: string
): Promise<string> {
  const api = google.slides({version: 'v1', auth: oauth2Client});
  const res = await api.presentations.batchUpdate({
    presentationId,
    requestBody: {
      requests: [
        {
          duplicateObject: {
            objectId: slideId,
          },
        },
      ],
    },
  });
  return res.data.replies?.[0]?.duplicateObject?.objectId ?? '';
}

export interface ElementUpdate {
  elementId: string;
  text?: string;
  imageUrl?: string;
}

export async function editSlide(
  oauth2Client: OAuth2Client,
  presentationId: string,
  updates: ElementUpdate[]
): Promise<void> {
  const api = google.slides({version: 'v1', auth: oauth2Client});
  const requests: SlidesV1.Schema$Request[] = [];
  updates.forEach(u => {
    if (u.text !== undefined) {
      requests.push({
        deleteText: {
          objectId: u.elementId,
          textRange: {type: 'ALL'},
        },
      });
      requests.push({
        insertText: {
          objectId: u.elementId,
          text: u.text,
          insertionIndex: 0,
        },
      });
      // Ensure text automatically shrinks to fit the shape bounds
      requests.push({
        updateShapeProperties: {
          objectId: u.elementId,
          shapeProperties: {
            autofit: {autofitType: 'TEXT_AUTOFIT'},
          },
          fields: 'autofit',
        },
      });
    }
    if (u.imageUrl) {
      requests.push({
        replaceImage: {
          imageObjectId: u.elementId,
          url: u.imageUrl,
        },
      });
    }
  });
  if (requests.length) {
    await api.presentations.batchUpdate({
      presentationId,
      requestBody: {requests},
    });
  }
}
