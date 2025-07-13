import * as vscode from 'vscode';
import { PdfPreview } from './pdfPreview';

export class PdfCustomProvider implements vscode.CustomReadonlyEditorProvider {
  public static readonly viewType = 'pdf.preview';

  private readonly _previews = new Set<PdfPreview>();
  private _activePreview: PdfPreview | undefined;

  constructor(private readonly extensionRoot: vscode.Uri) {}

  public openCustomDocument(uri: vscode.Uri): vscode.CustomDocument {
    return { uri, dispose: (): void => {} };
  }

  public async resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel
  ): Promise<void> {
    const preview = new PdfPreview(
      this.extensionRoot,
      document.uri,
      webviewPanel
    );
    this._previews.add(preview);
    this.setActivePreview(preview);

    webviewPanel.onDidDispose(() => {
      preview.dispose();
      this._previews.delete(preview);
    });

    webviewPanel.onDidChangeViewState(() => {
      if (webviewPanel.active) {
        this.setActivePreview(preview);
      } else if (this._activePreview === preview && !webviewPanel.active) {
        this.setActivePreview(undefined);
      }
    });
    await preview.load();
  }

  public get activePreview(): PdfPreview | undefined {
    return this._activePreview;
  }

  private setActivePreview(value: PdfPreview | undefined): void {
    this._activePreview = value;
  }
}
