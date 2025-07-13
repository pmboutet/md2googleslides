// Copyright 2019 Google Inc.
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

import Debug from 'debug';
import fs from 'fs';
import {request, FormData} from 'undici';

const debug = Debug('md2gslides');

/**
 * Uploads a local file to temporary storage so it is HTTP/S accessible.
 *
 * Currently uses https://file.io for free emphemeral file hosting.
 *
 * @param {string} filePath -- Local path to image to upload
 * @returns {Promise<string>} URL to hosted image
 */
async function uploadLocalImage(filePath: string): Promise<string> {
  debug('Registering file %s', filePath);

  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const response = await request('https://file.io?expires=1h', {
      method: 'POST',
      body: form,
    });

    const responseData: any = await response.body.json();

    if (!responseData.success) {
      debug('Unable to upload file: %O', responseData);
      throw new Error(`Upload failed: ${JSON.stringify(responseData)}`);
    }

    debug('Temporary link: %s', responseData.link);
    return responseData.link;
  } catch (error: unknown) {
    debug('Error uploading file: %O', error);
    throw error;
  }
}

export default uploadLocalImage;
