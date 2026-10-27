import { createPreviewService } from '../application/preview.js';
import { previewFiles } from '../infrastructure/browser/preview-files.js';
import { customerPresenter } from '../infrastructure/browser/customer-presenter.js';
import { createWorkspace } from '../application/workspace.js';
import * as repository from '../infrastructure/local/vault.js';
import { browserFiles } from '../infrastructure/browser/files.js';

const files = { ...browserFiles, ...previewFiles };
export const workspace = createWorkspace({ repository, files });
export const previews = createPreviewService({ files, presenter: customerPresenter });
export const readCustomerPresentation = () => customerPresenter.read();
